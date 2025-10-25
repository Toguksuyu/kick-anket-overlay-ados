// --- AYARLAR ---
// Senin Kick Kanal ID'n. Bu, kick.com/SENIN-KULLANICI-ADIN adresindeki
// kullanıcı adın değil, API'nin kullandığı sayısal ID.
// Bana verdiğin ID'yi buraya giriyorum:
const KICK_CHANNEL_ID = '7505488';

// --- GLOBAL DEĞİŞKENLER ---

// Aktif anketin verilerini tutar
let currentPoll = {
    title: "",
    // Seçenekleri tutar, örn: { "1": "Evet", "2": "Hayır" }
    options: {}, 
    // Oyları tutar, örn: { "1": 0, "2": 0 }
    votes: {}
};

// Kimlerin oy kullandığını takip eder (herkesin bir oy hakkı olması için)
let voters = new Set();

// HTML elementlerine hızlı erişim
const pollContainer = document.getElementById('poll-container');
const pollTitle = document.getElementById('poll-title');
const pollOptionsList = document.getElementById('poll-options');


// --- ANA FONKSİYONLAR ---

/**
 * Bu fonksiyon, sayfa yüklendiğinde çalışır.
 * Kick API'sinden chat bilgilerini alır ve WebSocket'e bağlanır.
 */
async function initializeChatConnection() {
    try {
        // 1. Kick API'sinden chat odası bilgilerini çek
        // Bu, bize Pusher'a (WebSocket servisi) bağlanmak için gereken anahtarları verir.
        const apiUrl = `https://kick.com/api/v2/channels/${KICK_CHANNEL_ID}/chatroom`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error("Kick API'sinden chat odası bilgisi alınamadı. Kanal ID'nizi kontrol edin.");
            return;
        }

        const data = await response.json();
        
        // Gelen veriden Pusher için gerekli bilgileri alıyoruz
        const pusherKey = data.data.pusher_app_key;
        const pusherCluster = data.data.pusher_app_cluster;
        const pusherChannelName = data.data.broadcast.channel; // örn: "chatrooms.7505488.v2"

        // 2. Pusher (WebSocket) bağlantısını kur
        const pusher = new Pusher(pusherKey, {
            cluster: pusherCluster
        });

        // 3. Doğru chat odası kanalına abone ol
        const channel = pusher.subscribe(pusherChannelName);

        // 4. 'ChatMessageEvent' olayını dinle (yani, yeni bir chat mesajı geldiğinde)
        channel.bind('App\\Events\\ChatMessageEvent', (eventData) => {
            // Gelen mesaj verisi (JSON formatında)
            const messageData = JSON.parse(eventData.data);
            
            // Bu mesajı işlemek için fonksiyonu çağır
            handleChatMessage(messageData);
        });

        console.log("Kick chat'ine başarıyla bağlanıldı. Mesajlar dinleniyor...");

    } catch (error) {
        console.error("Bağlantı hatası:", error);
        // Hata durumunda ekranda bir mesaj gösterebilirsiniz
        pollTitle.innerText = "Bağlantı Hatası!";
        pollContainer.classList.remove('hidden');
    }
}

/**
 * Chat'ten gelen her mesajı işler.
 */
function handleChatMessage(message) {
    const content = message.content.trim();
    const sender = message.sender;

    // Mesajı gönderenin moderatör veya yayıncı olup olmadığını kontrol et
    const isPrivilegedUser = sender.identity.badges.some(
        badge => badge.type === 'moderator' || badge.type === 'broadcaster'
    );

    // --- ANKET BAŞLATMA KOMUTU (!anket) ---
    // Sadece yetkili kullanıcılar başlatabilir
    if (content.startsWith('!anket ') && isPrivilegedUser) {
        // Komutu parçala: !anket "Soru" "Cevap 1" "Cevap 2" ...
        // tırnak içindeki metinleri yakalamak için bir regex kullanıyoruz.
        const parts = content.match(/"(.*?)"/g);
        
        // En az 1 soru ve 2 cevap olmalı (toplam 3 tırnaklı bölüm)
        if (parts && parts.length >= 3) {
            // Tırnakları temizle
            const cleanParts = parts.map(p => p.replace(/"/g, ''));
            
            const title = cleanParts[0]; // İlk bölüm sorudur
            const options = cleanParts.slice(1); // Geri kalanı seçeneklerdir
            
            startPoll(title, options);
        }
    }
    // --- ANKET BİTİRME KOMUTU (!anketibitir) ---
    // Sadece yetkili kullanıcılar bitirebilir
    else if (content === '!anketibitir' && isPrivilegedUser) {
        endPoll();
    }
    // --- OY KULLANMA ---
    // Aktif bir anket varsa VE mesaj, seçeneklerden biriyle (örn: "1", "2") eşleşiyorsa
    else if (currentPoll.title && currentPoll.options[content]) {
        // Kullanıcının ID'sini al
        const senderId = sender.id;
        handleVote(senderId, content);
    }
}

/**
 * Yeni bir anket başlatır.
 */
function startPoll(title, options) {
    // Eski anketi ve oyları sıfırla
    currentPoll.title = title;
    currentPoll.options = {};
    currentPoll.votes = {};
    voters.clear();

    // Seçenekleri ve oyları objeye yerleştir
    // {"1": "Cevap A", "2": "Cevap B"}
    // {"1": 0, "2": 0}
    options.forEach((option, index) => {
        const key = (index + 1).toString(); // Seçenek anahtarı "1", "2", "3" ...
        currentPoll.options[key] = option;
        currentPoll.votes[key] = 0;
    });

    // Arayüzü güncelle
    updatePollUI();
    
    // Anketi ekranda görünür yap
    pollContainer.classList.remove('hidden');
}

/**
 * Anketi bitirir ve ekrandan gizler.
 */
function endPoll() {
    // Verileri temizle
    currentPoll.title = "";
    currentPoll.options = {};
    currentPoll.votes = {};
    voters.clear();

    // Anketi ekrandan gizle
    pollContainer.classList.add('hidden');
}

/**
 * Gelen bir oyu işler.
 */
function handleVote(senderId, voteKey) {
    // Eğer bu kullanıcı daha önce oy kullanmışsa, işlemi durdur
    if (voters.has(senderId)) {
        return; 
    }

    // Kullanıcıyı oy kullananlar listesine ekle
    voters.add(senderId);

    // İlgili seçeneğin oyunu bir artır
    if (currentPoll.votes.hasOwnProperty(voteKey)) {
        currentPoll.votes[voteKey]++;
    }

    // Arayüzü yeni oylarla güncelle
    updatePollUI();
}

/**
 * HTML'deki anket görünümünü günceller.
 */
function updatePollUI() {
    // Başlığı ayarla
    pollTitle.innerText = currentPoll.title;

    // Eski seçenekleri temizle
    pollOptionsList.innerHTML = '';

    // Toplam oy sayısını hesapla
    let totalVotes = 0;
    for (const key in currentPoll.votes) {
        totalVotes += currentPoll.votes[key];
    }

    // Her bir seçenek için yeni HTML elementleri oluştur
    for (const key in currentPoll.options) {
        const optionText = currentPoll.options[key];
        const voteCount = currentPoll.votes[key];

        // Bu seçeneğin toplam oydaki yüzdesini hesapla
        // (Sıfıra bölme hatasını engellemek için kontrol)
        const percentage = totalVotes === 0 ? 0 : (voteCount / totalVotes) * 100;

        // Yeni bir liste (li) elementi oluştur
        const li = document.createElement('li');
        li.className = 'poll-option';

        // Elementin içeriğini HTML olarak ayarla
        li.innerHTML = `
            <div class="poll-bar" style="width: ${percentage.toFixed(1)}%;"></div>
            <span class="option-text">${optionText} (${key})</span>
            <span class="option-votes">${voteCount} Oy</span>
        `;
        
        // Oluşturulan elementi listeye ekle
        pollOptionsList.appendChild(li);
    }
}


// --- BAŞLANGIÇ ---
// Sayfa yüklendiğinde chat bağlantısını başlat
document.addEventListener('DOMContentLoaded', initializeChatConnection);
