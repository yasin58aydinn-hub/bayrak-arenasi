# Bayrak Arenası

Yorumlarla güçlenen bayrak topu dövüşleri. Bu depo her gün kendiliğinden üç video üretir ve YouTube'a yükler:

| Saat (TR) | Ne olur |
|---|---|
| 08:23 | **Sabah işi** eşleşmeyi seçer, 15 saniyelik oylama Shorts'unu üretir ve hemen yayınlar. Ardından kanal adına ilk yorumu yazar: oylama Shorts'una ve bu maçı duyuran dünkü öne çıkanlar Shorts'una. |
| 18:07 | **Akşam işi** yorumları sayar (oylama burada kapanır), güçleri toplam yorum payına göre dağıtır, maçı oynatır ve videoları üretir. Oy sayılan Shorts'lar: sabahki oylama, dünkü öne çıkanlar ve bugünkü 14:00 montajı. Son ikisi bu maçı kapanış kartında duyurur. |
| 20:00 | Uzun maç videosu (yaklaşık 3-4 dakika) kendi küçük resmiyle yayınlanır. |
| 20:10 | Öne çıkanlar Shorts'u yayınlanır, sonunda yarınki maçı duyurur. Oylama Shorts'unun açıklamasına sonuç ve maç linki eklenir. |
| Ertesi gün 14:00 | Maçın en sert anlarından (parry, çatışma, kalkan kırılması) bir montaj Shorts'u yayınlanır, sonunda o akşamki maçı duyurur. |
| 23:41 | **Gece raporu** bütün videoların izlenme, beğeni, yorum ve izlenme süresi verilerini `data/rapor.md` ve `data/istatistik.json` dosyalarına yazar. |

GitHub'ın zamanlayıcısı yoğun saatlerde 5-30 dakika gecikebilir. Akşam videoları YouTube'da önceden planlandığı için yayın saatleri kaymaz. Oylama Shorts'u ise kanalın ilk yorumu yazılabilsin diye sabah işi bitince yayınlanır.

Oyunun kendisi `index.html`. GitHub Pages açıldığında tarayıcıdan panel olarak da kullanılabilir.

---

## Kurulum (bir kez yapılır)

### 1. Google Cloud projesi

Kanalın Gmail hesabıyla [console.cloud.google.com](https://console.cloud.google.com) adresine gir.

1. Yeni bir proje oluştur (ör. `bayrak-arenasi`). Motivasyon kanalının projesini kullanma: YouTube kotası proje başına sayılır.
2. **API'ler ve Hizmetler → Kitaplık** bölümünde "YouTube Data API v3"ü bul ve **Etkinleştir**. Aynı yerden "YouTube Analytics API"yi de etkinleştir (gece raporundaki izlenme süreleri için).
3. **OAuth izin ekranı**nı kur: kullanıcı türü **Harici**, uygulama adı "Bayrak Arenası", destek e-postası olarak kanalın Gmail'i. Test kullanıcılarına da kanalın Gmail'ini ekle.
4. **Önemli:** İzin ekranında **Uygulamayı yayınla** diyerek durumu "Üretim"e al. "Test" durumunda bırakırsan anahtar 7 günde bir geçersiz olur ve otomasyon durur. Uygulamanın Google tarafından doğrulanması gerekmez.
5. **Kimlik bilgileri → Kimlik bilgisi oluştur → OAuth istemci kimliği**, uygulama türü **Masaüstü uygulaması**. Çıkan **İstemci kimliği** ve **İstemci gizli anahtarı**nı bir kenara not et.

### 2. Yenileme anahtarı

Bunu kendi bilgisayarında bir kez yapacaksın (Node.js 20 veya üstü gerekir).

1. Bu depoyu indir: **Code → Download ZIP**, sonra klasörü aç.
2. Klasörde bir terminal aç ve şunu çalıştır:
   ```
   node scripts/get_token.js İSTEMCİ_KİMLİĞİ İSTEMCİ_GİZLİ_ANAHTARI
   ```
3. Tarayıcı açılınca kanalın hesabıyla giriş yap. "Google bu uygulamayı doğrulamadı" uyarısı çıkarsa **Gelişmiş → Bayrak Arenası'na git** de ve izin ver. Bu senin kendi uygulaman, güvenli.
4. Terminalde çıkan uzun yazı senin **yenileme anahtarın**.

### 3. GitHub Secrets

Depoda **Settings → Secrets and variables → Actions → New repository secret** ile üç gizli değer ekle:

| Ad | Değer |
|---|---|
| `YT_CLIENT_ID` | İstemci kimliği |
| `YT_CLIENT_SECRET` | İstemci gizli anahtarı |
| `YT_REFRESH_TOKEN` | 2. adımda aldığın yenileme anahtarı |

Bunlar şifreli saklanır. Depo herkese açık olsa da kimse göremez, kayıtlarda da görünmez.

### 4. YouTube kanal ayarları

- **Telefon doğrulaması:** [youtube.com/verify](https://www.youtube.com/verify). Bu olmadan küçük resim yüklenemez.
- **Gelişmiş özellikler:** Studio → Ayarlar → Kanal → Özellik uygunluğu. Shorts'a "İlgili video" bağlamak için gerekli.
- **Kitle:** Studio → Ayarlar → Yükleme varsayılanları → "Hayır, çocuklara özel değil". Sistem bunu her yüklemede zaten gönderiyor, yine de ayarla. Çocuklara özel işaretlenen videolarda yorumlar kapanır ve oylama çalışmaz.

### 5. API denetimi (önemli)

Google, denetimden geçmemiş projelerden API ile yüklenen videoları **özel** olarak kilitliyor. Kilidi kaldırmak için Google'da "YouTube API Services Audit and Quota Extension Form" diye aratıp formu doldur. Kendi kanalına yükleme yaptığını ve yorumları oylama için okuduğunu anlat. Onay birkaç hafta sürebilir.

Onay gelene kadar sistem çalışmaya devam eder: videolar üretilir ve yüklenir, ama özel kalır. Bu sürede her videoyu Studio'dan elle "Herkese açık" yapman gerekir (telefondan birkaç dokunuş). Akşam işinin özetinde ve kayıtlarında bu durum için bir uyarı göreceksin.

### 6. Panel (GitHub Pages)

**Settings → Pages → Source: Deploy from a branch → main / (root) → Save.** Birkaç dakika sonra oyun şu adreste açılır:
`https://yasin58aydinn-hub.github.io/bayrak-arenasi/`

### 7. Deneme

1. **Actions** sekmesinde **Akşam - maç ve öne çıkanlar → Run workflow** seç. "Deneme modu" işaretli kalsın, **Run** de.
2. Yaklaşık 25 dakika sonra çalışmanın sayfasındaki **aksam-videolari** çıktısını indir ve videoları izle.
3. Deneme modu YouTube'a hiçbir şey yüklemez ve kayıtları değiştirmez.
4. Her şey yolundaysa **Sabah**'ı bir kez deneme modu kapalı çalıştırarak gerçek bir yüklemeyi dene. Bundan sonra iki iş de her gün kendiliğinden çalışır.

---

## Günlük kullanım

**Eşleşme seçmek:** `data/kuyruk.txt` dosyasına her satıra bir maç yaz (ör. `de-fr`). En üstteki satır sıradaki maç olur. Liste boşsa sistem kendisi seçer: Türkiye gün aşırı maça çıkar (`featuredCountry`, `featuredEvery`), son 30 günde oynanan eşleşmeler tekrarlanmaz, art arda aynı ülke pek seçilmez, `blockedPairs` listesindekiler hiç seçilmez.

**Ayarlar** (`config/settings.json`):

| Ayar | Anlamı |
|---|---|
| `matchPublishTime`, `highlightPublishTime`, `montagePublishTime` | Yayın saatleri (TR saati) |
| `pollPublishTime` | Oylama Shorts'unun yayın saati. `null` ise sabah işi bitince yayınlanır (kanalın ilk yorumu için gerekli) |
| `seedComments` | Kanal, oylama Shorts'una ve dünkü öne çıkanlara ilk yorumu yazsın mı |
| `featuredCountry`, `featuredEvery` | Bu ülke en az kaç maçta bir oynasın (`"tr"`, `2` = gün aşırı) |
| `rounds` | Maçın round sayısı (5 = 3 alan kazanır) |
| `targetSeconds` | Uzun videonun hedef süresi, saniye |
| `thresholdPercent` | Her gücün açılması için gereken yorum payı (%) |
| `countryWeights` | Bir ülkenin daha sık seçilmesi için ağırlık (`"tr": 3` gibi) |
| `blockedPairs` | Hiç eşleştirilmeyecek ülke çiftleri |
| `tags` | Videolara eklenen etiketler |

Ayarların zamanlanmış saatleriyle uyumlu olması için iş akışlarının saatleri `.github/workflows/` içinde. Akşam işi, maç yayın saatinden en az 1 saat önce başlamalı.

**Ülke adları ve takma adlar:** `config/countries.json`. Yorumlarda bu adlardan biri geçerse oy sayılır ("Türkiye", "turkey", "🇹🇷" gibi). Her kişinin yalnızca ilk oyu sayılır, kanalın kendi yorumları sayılmaz.

**Bir şey ters giderse:** GitHub, başarısız olan her çalışma için e-posta atar. Ayrıntılar **Actions** sekmesindeki kayıtlarda. Bot her gün `data/state.json` dosyasına kayıt düştüğü için depo hep "aktif" sayılır ve GitHub zamanlanmış işleri kapatmaz.

## Kanal yönetimi ve raporlar

Her gece `data/rapor.md` güncellenir: son 7 günün toplamları, her günün oylama, maç ve özet izlenmeleri, maç videolarının ortalama izlenme oranı ve en çok izlenen eşleşmeler. Ham veriler `data/istatistik.json` içinde. Bu iki dosya, ayarları (eşik yüzdeleri, maç süresi, yayın saatleri, eşleşme ağırlıkları, başlıklar) veriye göre düzenlemek için kullanılır.

## API'nin yapamadıkları

- Oylama Shorts'una **İlgili video** bağlamak: Studio'dan elle (akşam özetinde hatırlatma var).
- Yorum **sabitlemek**.

## Dakika ve kota

- Depo **herkese açık** olduğu sürece GitHub Actions ücretsiz ve sınırsız. Gizli depoda ücretsiz plan ayda 2.000 dakika verir; bu iş günde yaklaşık 30 dakika kullanır.
- YouTube API kotası günde 3 yüklemeye rahatça yeter.

## Dosyalar

```
index.html            oyun ve panel
music/                kanala özel üretilmiş 5 savaş müziği
fonts/                video yazı tipi (Poppins, OFL lisanslı)
assets/               logo, banner, kanal açıklaması
config/               ayarlar ve ülke adları
data/state.json       günlük kayıt (bot günceller)
data/kuyruk.txt       sıradaki maçlar
scripts/daily.js      günlük akış (sabah / akşam)
scripts/lib/          video üretimi, YouTube, oy sayma, eşleşme seçimi
scripts/get_token.js  yenileme anahtarı alma aracı
scripts/music.py      müzikleri yeniden üretme aracı
tests/                oy sayma testleri ve sahte YouTube sunucusu
```
