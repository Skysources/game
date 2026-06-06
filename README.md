# SKYZONE — Idle MMO (Tasarım Belgesi v6 implementasyonu)

Tasarım belgesindeki sistemlere göre üretilmiş, oynanabilir tek-oyunculu çekirdek döngü prototipi.
Saf HTML/CSS/JS — derleme adımı yok.

## Çalıştırma
- `index.html` dosyasını bir tarayıcıda aç, **veya**
- Statik sunucu: `python3 -m http.server 8731` → `http://localhost:8731`

## Tasarım
UI birebir **`skyzone-ui-1-harita.html`** mockup'ına göre yapıldı:
- **Sürüklenebilir/zoom'lanabilir harita** (gerçek bölge arka plan görselleri ile)
- **Yüzen dairesel nav** (🗺️ Harita · ☰ Menü · 🎒 Çanta)
- **Radyal dünya haritası** (üçgen formasyon, SVG bağlantı çizgileri, bölge kartları)
- **Menü hub'ı** (Atölye · Banka · Pazaryeri + etkinlik/istatistik kartları)
- **Zengin toplama modalı** (alet verimi, bonuslar, paylaşımlı oyuncular, drop pill'leri, ilerleme)
- **Dungeon modalı** (kat seçimi + canlı auto-combat), **seyahat modalı** (önizleme görseli)
- **Çanta ekranı** (`skyzone-canta.html` mockup'una birebir): kuşanım paperdoll'u,
  ağırlık/slot barları, rarity parıltılı slotlar (W/G/B/O/R + pulse), kategori sekmeleri,
  sıralama ve seçili eşya için aksiyon dock'u (Kuşan/Kullan/Sat/Bankaya/At)
- **Perk kalite sistemi** (`skyzone-perk.html` mockup'una birebir): her perk roll'unda
  1–10 kalite (değerin aralık içindeki konumu), renk bantları (Zayıf→Kusursuz),
  10-pip rainbow çubuğu ve ortalama kalite.
- **Item popover**: item'a dokununca tam üstünde küçük bir pencere açılır (oka ile
  item'a sabitli); item adı, base stat, ortalama kalite, perkler (kalite çubuklarıyla)
  ve aksiyonlar burada görünür. Dışarı dokununca / kaydırınca kapanır.
- **Sürükle-bırak**: çantadaki ekipmanı paperdoll'a sürükle → kuşan; kuşanılı item'ı
  çantaya sürükle → çıkar; ekipmanları sürükleyerek sırala (mouse + dokunmatik).
- **Banka ekranı** (`skyzone-banka.html` mockup'una birebir): iki bölüm (Envanter | Banka),
  şehir sekmeleri (sadece kendi şehrinin bankası erişilebilir), kapasite barları,
  rarity slotları, eşya seç → miktar seçmeli transfer modalı (slider + 1/10/50/100/Tümü),
  stack birleştirme (banka 999 / envanter 99) + slot kontrolü, +25 slot yükseltme (5.000💰), sırala.

Görseller kaynak dosyalardan çıkarıldı: malzeme/node SVG'leri → `js/art.js`,
bölge/şehir arka planları → `js/zoneimg.js`, ekipman/tüketim themed ikonları → `js/icons.js`.

## Uygulanan Sistemler (belge bölümlerine göre)
| Bölüm | Sistem | Durum |
|---|---|---|
| I | Kaynak sistemi · 6 aile × 3 tier × 5 rarity | ✅ |
| II | Dünya coğrafyası · 3 şehir + T1/T2/T3 zone + biome dağılımı | ✅ |
| VI | CP & Combat formülü (ratio, cape proc, crit, dodge) | ✅ |
| VII | PvP/PvE ölüm, zone death-loot kuralları | ✅ (PvE; PvP multiplayer stub) |
| VIII | Drop sistemi · node boyut/cascade/tier matrisi | ✅ |
| IX | Craft · 12 reçete, 50/30/20, input→tier/rarity | ✅ |
| X | Item base stat ±%25 roll + tier/rarity çarpan | ✅ |
| XI–XII | Perk sistemi (~150 perk) + magnitude tabloları | ✅ |
| XIII | Item EXP & tier gate (T2:1000, T3:5000) | ✅ |
| XIV | Dungeon · 5 kat, auto-circle, mob/boss, loot | ✅ |
| XV | Yemek & iksir buffları (additive stack, timer) | ✅ |
| XVI | Enhancement (+%3..15, kırılma riski) & rarity upgrade | ✅ |
| XVII | Tılsımlar (kırılma/düşüş/renk koruma) | ✅ |
| XVIII | Ağırlık & travel (mount/çanta kapasite, yük cezası) | ✅ |
| XIX | Banka (per-city), market (vergi), shop | ✅ |
| XX | Toplama aleti tier×node verim matrisi | ✅ |
| XXI | Karakter yaratma & tutorial | ✅ |
| III–V | Vatandaşlık/politika/ittifak/dünya savaşı | ⏳ multiplayer (belgede "ikinci dalga") |

## Oyun Döngüsü
🗺️ Harita → node topla · 🔨 Atölye → üret/geliştir · 🎒 Çanta → giy ·
⚔️ Zindan → savaş & loot · 🏛️ Şehir → banka/market/shop · 📜 Menü → stat/kayıt

## Dosya Yapısı
- `js/data.js` — tüm sabitler, tablolar, formül parametreleri
- `js/engine.js` — item üretimi, CP, perk roll, savaş çözümü, RNG
- `js/state.js` — oyuncu durumu, envanter/banka/ağırlık, kaydet/yükle
- `js/world.js` — zone/node spawn, harvest, travel
- `js/dungeon.js` — auto-circle savaş, boss, loot
- `js/craft.js` — craft, enhancement, upgrade, market, buff
- `js/ui.js` — tüm ekran/modal render (mockup yapısı)
- `js/game.js` — init, event delegation, harita pan/zoom, ana döngü
- `js/art.js` — çıkarılmış malzeme/node SVG görselleri
- `js/zoneimg.js` — çıkarılmış bölge/şehir arka plan görselleri

Kayıt otomatik (15 sn) + Menü'den manuel. `localStorage` kullanır.
