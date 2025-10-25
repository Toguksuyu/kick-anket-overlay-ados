// --- Ayarlar ---
// Chatroom ID'niz (ados için 7505488)
const KICK_CHATROOM_ID = '7505488';
// Kick'in genel Pusher anahtarı
const KICK_PUSHER_KEY = 'KIeR3t246qfg54we2b3l';
// Kick'in özel sunucusu
const KICK_PUSHER_HOST = 'ws-us2.pusher.com';

// --- Anket Durumu ---
let anketAktif = false;
let anketVerisi = {
  soru: '',
  secenekler: [],
};
let oyVerenler = new Set();

// --- HTML Elementleri ---
const pollContainer = document.getElementById('poll-container');

// --- Ana Fonksiyonlar ---

/**
 * 1. Adım: Verilen Chatroom ID'si ile Kick chat'ine bağlanır
 */
function connectToChat(chatroomId) {
  if (pollContainer.innerHTML.startsWith('HATA')) {
    pollContainer.innerHTML = '';
  }

  // --- BU SEFER ÇALIŞACAK AYARLAR ---
  const pusher = new Pusher(KICK_PUSHER_KEY, {
    cluster: 'us2',
    wsHost: KICK_PUSHER_HOST,
    wssHost: KICK_PUSHER_HOST, // Güvenli (TLS) host
    forceTLS: true,           // Sadece güvenli (wss) bağlantı zorla
    disableStats: true,
    enabledTransports: ['wss'], // SADECE GÜVENLİ WEBSOCKET'e izin ver
    // Portları belirtmiyoruz, forceTLS:true bunu halletmeli (port 443)
  });
  // --- Ayarlar Bitti ---

  const channel = pusher.subscribe(`chatrooms.${chatroomId}.v2`);
  console.log(`Kanala abone olunuyor: chatrooms.${chatroomId}.v2`);

  // Sohbet mesajlarını dinle
  channel.bind('App\\Events\\ChatMessageEvent', (data) => {
    const messageData = JSON.parse(data.data);
    const icerik = messageData.message.content;
    const gonderen = messageData.sender;
    const gonderenID = gonderen.id;

    const isYayinSahibi = gonderen.identity.badges.some(
      (badge) => badge.type === 'broadcaster'
    );

    // --- Anket Başlatma Komutu ---
    if (icerik.startsWith('!poll ') && isYayinSahibi) {
      const parcalar = icerik.match(/"(.*?)"/g);
      if (parcalar && parcalar.length >= 3) {
        oyVerenler.clear();
        anketVerisi.soru = parcalar[0].replace(/"/g, '');
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
        setTimeout(() => {
          pollContainer.classList.add('hidden');
        }, 10000);
      }
    }

    // --- Oy Kullanma ---
    else if (anketAktif && /^\d+$/.test(icerik)) {
      if (oyVerenler.has(gonderenID)) {
        return;
      }

      const vote = parseInt(icerik);
      if (vote > 0 && vote <= anketVerisi.secenekler.length) {
        anketVerisi.secenekler[vote - 1].votes++;
        oyVerenler.add(gonderenID);
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
    // Hatayı düzgün görelim diye JSON'a çeviriyoruz
    let errorMsg = JSON.stringify(err);
    pollContainer.innerHTML = `HATA: Chat sunucusuna bağlanılamadı. (${errorMsg})`;
    pollContainer.classList.remove('hidden');
  });
}

/**
 * 2. Adım: Anketi ekranda oluşturur ve gösterir
 */
function anketiGoster() {
  pollContainer.innerHTML = `
    <h2 id="poll-question"></h2>
    <ul id="poll-options"></ul>
  `;
  const pollQuestion = document.getElementById('poll-question');
  const pollOptions = document.getElementById('poll-options');

  if (pollQuestion) {
    pollQuestion.textContent = anketVerisi.soru;
  }
  if (pollOptions) {
    pollOptions.innerHTML = '';
  } else {
    console.error('poll-options elementi bulunamadı!');
    return;
  }

  anketVerisi.secenekler.forEach((option, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="vote-details">0 (0%)</div>
      <div class="option-text">${index + 1}. ${option.text}</div>
      <div class="vote-bar" style="width: 0%;"></div>
    `;
    pollOptions.appendChild(li);
  });

  pollContainer.style.display = 'block';
  setTimeout(() => pollContainer.classList.remove('hidden'), 50);
}

/**
 * 3. Adım: Gelen oylara göre anket çubuklarını ve sayılarını günceller
 */
function anketiGuncelle() {
  const pollOptions = document.getElementById('poll-options');
  if (!pollOptions) return;

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
connectToChat(KICK_CHATROOM_ID);
