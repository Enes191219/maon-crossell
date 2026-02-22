# Maon Crosssell Uygulaması - TODO

## Veritabanı & Backend
- [x] Veritabanı şeması: shopifyProducts tablosu
- [x] Veritabanı şeması: crosssellRules tablosu (kategori, etiket, fiyat, manuel)
- [x] Veritabanı şeması: manualPairings tablosu (manuel ürün kombinasyonları)
- [x] Veritabanı şeması: crosssellEvents tablosu (tıklama, dönüşüm, gelir)
- [x] Veritabanı şeması: shopifyConfig tablosu (API anahtarları, webhook)
- [x] Shopify Storefront API entegrasyonu (ürün çekme)
- [x] Webhook endpoint (ürün güncelleme, sipariş, stok)
- [x] Crosssell kural motoru (kategori, etiket, fiyat, manuel, LLM)
- [x] LLM ile akıllı crosssell önerileri
- [x] Crosssell öneri API endpoint'i (widget için)
- [x] Analitik veri toplama (tıklama, dönüşüm, gelir)
- [x] Analitik raporlama API'si

## Yönetim Paneli (Admin Dashboard)
- [x] Ana dashboard (özet metrikler, hızlı istatistikler, grafikler)
- [x] Shopify bağlantı ayarları sayfası (API key, store URL)
- [x] Ürün listesi ve senkronizasyon sayfası
- [x] Crosssell kural yönetimi sayfası
- [x] Kategori bazlı kural oluşturma/düzenleme
- [x] Etiket bazlı kural oluşturma/düzenleme
- [x] Fiyat aralığı bazlı kural oluşturma/düzenleme
- [x] Manuel ürün kombinasyonları sayfası
- [x] LLM öneri yönetimi sayfası
- [x] Analitik dashboard (tıklama, dönüşüm, gelir grafikleri)
- [x] Widget önizleme sayfası

## Widget & Embed
- [x] Ürün sayfası crosssell widget'ı
- [x] Sepet sayfası crosssell widget'ı
- [x] Shopify tema entegrasyon scripti (embed kodu)
- [x] Widget özelleştirme ayarları (renk, başlık, ürün sayısı)

## Testler
- [x] Crosssell kural motoru testleri (13 test)
- [x] Auth logout testi (1 test)
- [x] Toplam 14 test - tümü geçiyor

## Gelecek İyileştirmeler
- [ ] Shopify Admin API entegrasyonu (sipariş bazlı crosssell analizi)
- [ ] A/B test sistemi
- [ ] Email crosssell kampanyaları
- [ ] Müşteri segmentasyonu
