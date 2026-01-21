# 🏥 Sağlık Tesisleri Harita Uygulaması

Kahramanmaraş İl Sağlık Müdürlüğü için geliştirilmiş modern, mobil uyumlu sağlık tesisleri harita uygulaması.

## ✨ Özellikler

- ✅ **Harita Görünümü** - Leaflet.js + OpenStreetMap ile interaktif harita
- ✅ **Marker Clustering** - Yakın tesislerin otomatik gruplanması
- ✅ **Filtreleme** - İlçe ve tesis türüne göre filtreleme
- ✅ **Arama** - Tesis adı veya adrese göre arama
- ✅ **Yol Tarifi** - Google Maps entegrasyonu ile yol tarifi
- ✅ **Responsive Tasarım** - Mobil, tablet ve desktop uyumlu
- ✅ **PWA Desteği** - Mobil cihazlarda uygulama olarak kaydetme
- ✅ **Offline Çalışma** - Service Worker ile çevrimdışı destek
- ✅ **Geocoding** - Adres → Koordinat otomatik dönüşümü

## 🛠️ Teknolojiler

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Harita:** Leaflet.js 1.9.4 + OpenStreetMap
- **Backend:** Supabase (PostgreSQL)
- **Geocoding:** Nominatim (OpenStreetMap - Ücretsiz)
- **PWA:** Service Worker, Web App Manifest

## 📦 Kurulum

### 1. Supabase Projesi Oluşturma

1. [Supabase](https://supabase.com) hesabı oluşturun (ücretsiz)
2. Yeni bir proje oluşturun
3. Project Settings > API'den şu bilgileri alın:
   - **Project URL** (örn: `https://xyzcompany.supabase.co`)
   - **Anon/Public Key** (örn: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2. Veritabanı Kurulumu

1. Supabase Dashboard > SQL Editor'ü açın
2. `database/schema.sql` dosyasının içeriğini kopyalayın
3. SQL Editor'e yapıştırın ve "Run" butonuna tıklayın
4. Tablolar, örnek veriler ve fonksiyonlar otomatik oluşturulacak

### 3. Konfigürasyon

1. `assets/js/config.js` dosyasını açın
2. Supabase bilgilerinizi girin:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://SIZIN-PROJE-URL.supabase.co',  // Buraya kendi URL'nizi yazın
    anonKey: 'SIZIN-ANON-KEY'  // Buraya kendi key'inizi yazın
};
```

### 4. Uygulamayı Çalıştırma

**Yerel Geliştirme:**

```bash
# Python ile basit HTTP sunucusu
python -m http.server 8000

# Veya Node.js ile
npx http-server -p 8000
```

Tarayıcıda `http://localhost:8000` adresini açın.

**XAMPP ile:**

1. Proje klasörünü `c:\xampp\htdocs\` altına kopyalayın
2. XAMPP'i başlatın
3. Tarayıcıda `http://localhost/harita` adresini açın

## 📱 PWA Kurulumu (Mobil Uygulama)

### Android (Chrome)
1. Uygulamayı tarayıcıda açın
2. Sağ üst köşedeki menüden "Ana ekrana ekle" seçin
3. Uygulama simgesi ana ekranınıza eklenecek

### iOS (Safari)
1. Uygulamayı Safari'de açın
2. Paylaş butonuna tıklayın
3. "Ana Ekrana Ekle" seçin

## 🗺️ Kullanım

### Tesis Görüntüleme
- Harita üzerindeki marker'lara tıklayarak tesis bilgilerini görün
- Sol paneldeki listeden tesise tıklayarak haritada odaklanın

### Filtreleme
1. Sol panelde "İlçe" ve "Tesis Türü" filtrelerini seçin
2. "Filtrele" butonuna tıklayın
3. Harita ve liste otomatik güncellenecek

### Arama
1. Sol panelde arama kutusuna tesis adı veya adres yazın
2. "Ara" butonuna tıklayın veya Enter'a basın

### Yol Tarifi
1. Bir tesis marker'ına tıklayın
2. Popup'ta "🧭 Yol Tarifi Al" butonuna tıklayın
3. Google Maps açılacak ve yol tarifini gösterecek

## 👨‍💼 Yönetim Paneli

`haritayonetim/index.html` sayfasından tesisleri yönetebilirsiniz:
- ✅ Yeni tesis ekleme
- ✅ Mevcut tesisleri düzenleme
- ✅ Tesisleri silme
- ✅ Adres → Koordinat otomatik bulma (Geocoding)
- ✅ Haritadan manuel koordinat seçme

## 📊 Veritabanı Yapısı

### Tablolar

**districts** - İlçeler
- id, name, center_lat, center_lng

**facility_types** - Tesis Türleri
- id, name, icon, color, display_order

**facilities** - Sağlık Tesisleri
- id, district_id, facility_type_id, name, address, phone, email, website, latitude, longitude, description, image_url, is_active

## 🚀 Deployment (Yayınlama)

### GitHub Pages (Ücretsiz)

1. GitHub'da yeni repository oluşturun
2. Projeyi GitHub'a yükleyin:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI-ADINIZ/saglik-harita.git
git push -u origin main
```

3. Repository Settings > Pages > Source: "main" branch seçin
4. Uygulamanız `https://KULLANICI-ADINIZ.github.io/saglik-harita/` adresinde yayınlanacak

### Netlify (Ücretsiz)

1. [Netlify](https://netlify.com) hesabı oluşturun
2. "New site from Git" seçin
3. GitHub repository'nizi bağlayın
4. Deploy edin - Otomatik URL alacaksınız

### Vercel (Ücretsiz)

1. [Vercel](https://vercel.com) hesabı oluşturun
2. "Import Project" seçin
3. GitHub repository'nizi bağlayın
4. Deploy edin

## 🔧 Özelleştirme

### Harita Merkezi Değiştirme

`app.js` dosyasında:

```javascript
const KAHRAMANMARAS_CENTER = [37.5847, 36.9228]; // Koordinatları değiştirin
const DEFAULT_ZOOM = 12; // Zoom seviyesini ayarlayın
```

### Renk Teması Değiştirme

`style.css` dosyasında:

```css
:root {
    --primary: #667eea; /* Ana renk */
    --secondary: #764ba2; /* İkincil renk */
    /* Diğer renkler... */
}
```

## 📝 Lisans

MIT License - Özgürce kullanabilir ve değiştirebilirsiniz.

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 Destek

Sorularınız için:
- GitHub Issues açın
- E-posta: [email protected]

## 🎯 Gelecek Özellikler

- [ ] Admin panel authentication
- [ ] Excel import/export
- [ ] Fotoğraf yükleme
- [ ] Çoklu dil desteği
- [ ] Dark mode
- [ ] Gelişmiş raporlama

---

**Geliştirici:** AI Assistant  
**Versiyon:** 1.0.0  
**Son Güncelleme:** 2026-01-14
