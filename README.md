# Kick Chat Anketi OBS Ekranı

Bu proje, Kick yayıncılarının chat üzerinden anket başlatmasını ve sonuçları OBS'te canlı olarak göstermesini sağlayan bir "Browser Source" (Tarayıcı Kaynağı) overlay'idir.

## Özellikler

-   Yayıncı veya moderatörler chat'ten anket başlatabilir.
-   İzleyiciler chat'e seçeneğin numarasını (1, 2, 3...) yazarak oy kullanır.
-   Her izleyicinin bir oy hakkı vardır.
-   Anket sonuçları, yüzdelik çubuklarla birlikte OBS ekranında anlık olarak güncellenir.
-   OBS için şeffaf arka planlı şık bir tasarıma sahiptir.

## Kurulum ve OBS'e Ekleme

Projeyi kullanmak için bu dosyaları bir sunucuya yüklemeniz gerekir. **GitHub Pages** bunun için en kolay ve ücretsiz yöntemdir.

### GitHub Pages ile Kurulum

1.  Bu projedeki `index.html`, `style.css` ve `script.js` dosyalarını kopyalayın.
2.  Yeni bir GitHub reposu oluşturun (örn: `my-kick-poll`).
3.  Bu dosyaları oluşturduğunuz repoya yükleyin.
4.  Reponuzun **Settings** (Ayarlar) sayfasına gidin.
5.  Sol menüden **Pages** sekmesine tıklayın.
6.  **Branch** olarak `main` (veya `master`) seçin ve **Save** deyin.
7.  GitHub size `https://kullaniciadiniz.github.io/my-kick-poll/` gibi bir adres verecektir. **Bu adresi kopyalayın.** (Not: Sitenin aktifleşmesi 1-2 dakika sürebilir).

### OBS'e Ekleme

1.  OBS'i açın ve anketin görünmesini istediğiniz Sahne'ye (Scene) gelin.
2.  **Kaynaklar** (Sources) paneline sağ tıklayın -> **Ekle** -> **Tarayıcı** (Browser).
3.  Bir isim verin (örn: "Kick Anketi").
4.  Açılan özellikler penceresinde:
    * **URL** kısmına GitHub Pages'ten aldığınız adresi yapıştırın (`https://kullaniciadiniz.github.io/my-kick-poll/`).
    * **Genişlik** (Width) ve **Yükseklik** (Height) değerlerini anketin boyutuna göre ayarlayın (örn: Genişlik: `500`, Yükseklik: `600`).
    * **"Yerel dosya" (Local file) seçeneğinin işaretli OLMADIĞINDAN emin olun.**
    * **"Tarayıcıyı kapattığımda kaynağı kapat" (Shutdown source when not visible) seçeneğini İŞARETLEMEYİN.** Bu, siz sahne değiştirseniz bile anketin arka planda oyları saymaya devam etmesi için önemlidir.
5.  **Tamam**'a basın. Anketiniz artık OBS ekranınızda. Başlangıçta boş/şeffaf görünecektir.

## Nasıl Kullanılır?

**ÖNEMLİ:** `script.js` dosyasındaki `KICK_CHANNEL_ID` değişkenini kendi kanal ID'niz ile değiştirmeyi unutmayın!

### Anket Başlatma (Sadece Yayıncı/Mod)

Kick chat'inize aşağıdaki formatta bir mesaj yazın. Tırnak işaretleri önemlidir.

`!anket "Soru buraya" "Birinci cevap" "İkinci cevap" "Üçüncü cevap"`

*Örnek:*
`!anket "Bu akşam hangi oyunu oynayalım?" "Valorant" "CS2" "Sohbet"`

### Oy Kullanma (Tüm İzleyiciler)

İzleyicilerin oy kullanmak için chat'e sadece seçeneğin numarasını yazması yeterlidir.

*Örnek:*
`1` (Valorant için)
`2` (CS2 için)

### Anketi Bitirme (Sadece Yayıncı/Mod)

Anketi ekrandan kaldırmak için chat'e şunu yazın:

`!anketibitir`
