# Bayrak Arenası: kanal yönetim notları

Bu depo, Türkçe "Bayrak Arenası" YouTube kanalını otomatik yönetir. Kanal sahibi düzenli olarak performans verilerine bakılmasını ve ayarların buna göre iyileştirilmesini istiyor.

## Günlük akış
- `sabah.yml` (08:23 TR): eşleşme seçilir, oylama Shorts'u üretilip hemen yayınlanır. Kanal, oylama Shorts'una ve bu maçı duyuran dünkü öne çıkanlara ilk yorumu yazar.
- `aksam.yml` (18:07 TR): yorumlar sayılır (oylama + dünkü öne çıkanlar + bugünkü montaj; ikisi de kapanış kartında bu maçı duyurur), maç oynatılır, uzun video 20:00'a, öne çıkanlar Shorts'u 20:10'a ve en sert anlardan montaj Shorts'u ertesi gün 14:00'e planlanır.
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

## Veriden öğrenilenler
- 2026-10-21 (ilk 3 gün): Her Shorts 1.100-1.700 izlenmede kalıyor (YouTube'un deneme turu). İzleyen sonuna kadar izliyor (oylama %100+, öne çıkanlar %80), ama beğeni oranı %0,3-0,9 ve son iki oylamaya hiç yorum gelmedi. Uzun videolar 0-3 izlenme aldı: yeni kanalda gösterim yok, ve Shorts açıklamasındaki linkler tıklanamıyor. Bu yüzden kapanış kartı "MAÇIN TAMAMI KANALIMIZDA" oldu. Türkiye maçları daha çok izlendi ve bütün yorumları aldı; Türkiye artık gün aşırı oynuyor.
- 2026-10-21 Studio (son 28 gün, bütün Shorts): %42,5 izlemeye devam etti, %57,5 kaydırıp geçti. Sorun açılıştaydı: oylamada ilk karede kamera uzaktaydı, yorum çubuğu ve kapanış kartındaki çağrı oynatıcının başlık alanının altında kalıyordu, öne çıkanlar 2 sn bekleyerek açılıyordu. Düzeltildi: ilk karede yakın çekim ve vuruş, kanca yazısı ilk kareden görünür, dikey kırpmada dövüşçüler ekranın ortasına alındı, çağrılar alt %25'in ve sağdaki düğmelerin dışında.
- Bakılacaklar: "izlemeye devam" oranı (hedef %60+, sahibinden Studio ekran görüntüsü), oylama başına sayılan oy (üç kaynaktan), Shorts'ların deneme turunu geçip geçmediği (2.000+ izlenme).
