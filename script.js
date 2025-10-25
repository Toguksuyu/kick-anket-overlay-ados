// --- Ayarlar ---
// Kanal ID'niz (ados için 7593731)
const KICK_CHANNEL_ID = '7593731';
// Kick'in genel Pusher anahtarı (Bu değişmez)
const KICK_PUSHER_KEY = 'KIeR3t246qfg54we2b3l';
const KICK_PUSHER_CLUSTER = 'ws-us2.pusher.com';

// --- Anket Durumu ---
let anketAktif = false;
let anketVerisi = {
  soru: '',
  secenekler: [], // { text: 'Seçenek 1', votes: 0 } formatında olacak
};
// Birden fazla oy kullanmayı engellemek için
let oyVerenler = new Set();

// --- HTML Elementleri ---
const pollContainer = document.getElementById('poll-container');
const pollQuestion = document.getElementById('poll-question');
const pollOptions = document.getElementById('poll-options');

// --- Ana Fonksiyonlar ---

/**
 * 1. Adım: Kanal ID'sinden Chatroom ID'sini alır
 */
async function getChatroomId() {
  try {
    const response = await fetch(
      `https://kick.com/api/v2/channels/${KICK_CHANNEL_ID}`
    );
    if (!response.ok) throw new Error('Kanal bilgisi alınamadı.');
    const data = await response.json();
    if (!data.chatroom || !data.chatroom.id)
      throw new Error('Chatroom ID bulunamadı.');

    console.log('Chatroom ID alındı:', data.chatroom.id);
    return data.chatroom.id;
  } catch (error) {
    console.error('Hata:', error);
    // Hata olursa ekranda göster
    pollContainer.innerHTML = `HATA: Kick kanal bilgisi alınamadı. (${error.message})`;
    pollContainer.classList.remove('hidden');
  }
}

/**
 * 2. Adım: Alınan Chatroom ID'si ile Kick chat'ine bağlanır
 */
function connectToChat(chatroomId) {
  const pusher = new Pusher(KICK_PUSHER_KEY, {
    wsHost: KICK_PUSHER_CLUSTER,
    wsPort: 443,
    wssPort: 443,
    disableStats: true,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  });

  const channel = pusher.subscribe(`chatrooms.${chatroomId}.v2`);
  console.log(`Kanala abone olunuyor: chatrooms.${chatroomId}.v2`);

  // Sohbet mesajlarını dinle
  channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    const messageData = JSON.parse(data.data);
    const icerik = messageData.message.content;
    const gonderen = messageData.sender;
    const gonderenID = gonderen.id;

    // Sadece yayın sahibinin komutlarını dinle
    const isYayinSahibi = gonderen.identity.badges.some(
      (badge) => badge.type === 'broadcaster'
    );

    // --- Anket Başlatma Komutu ---
    // Örnek: !poll "Soru bu" "Seçenek 1" "Seçenek 2" "Seçenek 3"
    if (icerik.startsWith('!poll ') && isYayinSahibi) {
      // Tırnak içindeki her şeyi yakala
      const parcalar = icerik.match(/"(.*?)"/g);
      if (parcalar && parcalar.length >= 3) {
        // En az 1 soru ve 2 seçenek olmalı
        // Önceki anketi sıfırla
        oyVerenler.clear();
        anketVerisi.soru = parcalar[0].replace(/"/g, ''); // İlk parça soru
        anketVerisi.secenekler = parcalar.slice(1).map((opt) => ({
          text: opt.replace(/"/g, ''),
          votes: 0,
        }));
        anketAktif = true;
        anketiGoster();
        console.log('Anket başlatıldı:', anketVerisi);
      }
    }

    // --- Anket Bitirme Komutu ---
    else if (icerik.startsWith('!endpoll') && isYayinSahibi) {
      if (anketAktif) {
        anketAktif = false;
        console.log('Anket bitirildi.');
        // Sonuçları 10 saniye göster ve gizle
        setTimeout(() => {
          pollContainer.classList.add('hidden');
        }, 10000);
      }
    }

    // --- Oy Kullanma ---
    // Sadece anket aktifken ve mesaj sadece bir sayı ise
    else if (anketAktif && /^\d+$/.test(icerik)) {
      if (oyVerenler.has(gonderenID)) {
        // Bu kişi zaten oy kullanmış
        return;
      }

      const vote = parseInt(icerik);
      // Geçerli bir seçenek numarası mı? (örn: 1, 2, 3...)
      if (vote > 0 && vote <= anketVerisi.secenekler.length) {
        anketVerisi.secenekler[vote - 1].votes++; // Diziler 0'dan başladığı için -1
        oyVerenler.add(gonderenID); // Oy vereni listeye ekle
        anketiGuncelle();
        console.log(`${gonderen.username} oy kullandı: ${vote}`);
      }
    }
  });

  pusher.connection.bind('connected', () => {
    console.log('Kick chatine başarıyla bağlandı!');
  });
  pusher.connection.bind('error', (err) => {
    console.error('Pusher bağlantı hatası:', err);
  });
}

/**
 * 3. Adım: Anketi ekranda oluşturur ve gösterir
 */
function anketiGoster() {
  pollQuestion.textContent = anketVerisi.soru;
  pollOptions.innerHTML = ''; // Eski seçenekleri temizle

  anketVerisi.secenekler.forEach((option, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="vote-details">0 (0%)</div>
      <div class="option-text">${index + 1}. ${option.text}</div>
      <div class="vote-bar" style="width: 0%;"></div>
    `;
    pollOptions.appendChild(li);
  });

  // Kutuyu görünür yap
  pollContainer.style.display = 'block';
  // CSS geçişi için opacity'yi değiştir
  setTimeout(() => pollContainer.classList.remove('hidden'), 50);
}

/**
 * 4. Adım: Gelen oylara göre anket çubuklarını ve sayılarını günceller
 */
function anketiGuncelle() {
  const toplamOy = anketVerisi.secenekler.reduce(
    (acc, opt) => acc + opt.votes,
    0
  );
  const liElemanlari = pollOptions.getElementsByTagName('li');

  anketVerisi.secenekler.forEach((option, index) => {
    const yuzde = toplamOy === 0 ? 0 : (option.votes / toplamOy) * 100;
    const li = liElemanlari[index];

    if (li) {
      li.querySelector('.vote-bar').style.width = `${yuzde}%`;
      li.querySelector(
        '.vote-details'
      ).textContent = `${option.votes} (${yuzde.toFixed(0)}%)`;
    }
  });
}

// --- Başlangıç ---
// Sayfa yüklendiğinde önce chatroom ID'sini al, sonra chat'e bağlan
getChatroomId().then((chatroomId) => {
  if (chatroomId) {
    connectToChat(chatroomId);
  }
});
