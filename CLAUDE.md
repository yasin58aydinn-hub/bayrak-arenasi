# Bayrak Arenası: kanal yönetim notları

Bu depo, Türkçe "Bayrak Arenası" YouTube kanalını otomatik yönetir. Kanal sahibi düzenli olarak performans verilerine bakılmasını ve ayarların buna göre iyileştirilmesini istiyor.

## Günlük akış
- `sabah.yml` (08:23 TR): eşleşme seçilir, oylama Shorts'u üretilip 10:00'a planlanır.
- `aksam.yml` (18:07 TR): yorumlar sayılır, maç oynatılır, uzun video 20:00'a, öne çıkanlar Shorts'u 20:10'a ve en sert anlardan montaj Shorts'u ertesi gün 14:00'e planlanır.
- `rapor.yml` (23:41 TR): `data/rapor.md` ve `data/istatistik.json` güncellenir.

## Verileri değerlendirirken
- Önce `data/rapor.md`, ayrıntı için `data/istatistik.json`, oylar ve sonuçlar için `data/state.json`.
- İyileştirme kolları: `config/settings.json` (eşik yüzdeleri, round sayısı, hedef süre, yayın saatleri, ülke ağırlıkları, engelli çiftler, etiketler), `scripts/lib/texts.js` (başlık ve açıklamalar), `data/kuyruk.txt` (eşleşmeler), `index.html` (oyun ve görseller).
- Yayın saatini değiştirirsen iş akışlarının cron saatlerini de uyumlu tut. Akşam işi maç yayınından en az 1 saat önce başlamalı.

## Kurallar
- Maç sonucu hiçbir zaman belirli bir ülke lehine ayarlanmaz. Maç kodu seçimi yalnızca süre ve heyecana bakar; çok yorum alan taraf güçlerle avantaj kazanır ama zafer garanti değildir.
- Savaş halindeki ya da yorumları nefret söylemine çevirebilecek eşleşmeler `blockedPairs` içinde kalır.
- Videolar "çocuklara özel değil" olarak yüklenir; yorumlar oylama için şarttır.
- Kod değişikliklerinden sonra `node tests/votes.test.js` ve gerekirse `tests/mock-youtube.js` ile uçtan uca deneme yapılır.
