# 🚀 Hızlı Başlangıç Kılavuzu

## 📋 Önkoşullar

- ✅ Modern bir web tarayıcısı (Chrome, Firefox, Safari, Edge)
- ✅ Supabase hesabı (ücretsiz) - https://supabase.com
- ✅ Metin editörü (VS Code önerilir)

## ⚡ 5 Dakikada Kurulum

### Adım 1: Supabase Projesi Oluştur (2 dakika)

1. https://supabase.com adresine git
2. "Start your project" butonuna tıkla
3. GitHub ile giriş yap
4. "New Project" butonuna tıkla
5. Proje adı: `saglik-tesisleri-harita`
6. Database şifresi belirle ve kaydet
7. Region: `Frankfurt` (en yakın)
8. "Create new project" butonuna tıkla
9. Proje oluşturulurken bekle (1-2 dakika)

### Adım 2: Veritabanını Kur (1 dakika)

1. Supabase Dashboard'da sol menüden **SQL Editor**'ü aç
2. `database/schema.sql` dosyasını aç
3. Tüm içeriği kopyala (Ctrl+A, Ctrl+C)
4. SQL Editor'e yapıştır (Ctrl+V)
5. Sağ alttaki **"Run"** butonuna tıkla
6. ✅ "Success" mesajını gör

### Adım 3: API Bilgilerini Al (30 saniye)

1. Sol menüden **Settings** > **API**'ye git
2. Şu bilgileri kopyala:
   - **Project URL** (örn: `https://abc123.supabase.co`)
   - **anon public** key (uzun bir metin)

### Adım 4: Konfigürasyonu Yap (30 saniye)

1. `assets/js/config.js` dosyasını aç
2. 11. satırda `YOUR_SUPABASE_URL_HERE` yerine **Project URL**'i yapıştır
3. 15. satırda `YOUR_SUPABASE_ANON_KEY_HERE` yerine **anon public** key'i yapıştır
4. Dosyayı kaydet (Ctrl+S)

### Adım 5: Uygulamayı Çalıştır (1 dakika)

**Seçenek A: Python ile (Önerilen)**
```bash
# Proje klasöründe terminal aç
python -m http.server 8000
```

**Seçenek B: Node.js ile**
```bash
npx http-server -p 8000
```

**Seçenek C: VS Code Live Server**
1. VS Code'da `index.html`'i aç
2. Sağ tıkla > "Open with Live Server"

**Seçenek D: XAMPP ile**
1. Proje klasörünü `c:\xampp\htdocs\harita` olarak kopyala
2. XAMPP'i başlat
3. `http://localhost/harita` adresini aç

### Adım 6: Test Et! 🎉

1. Tarayıcıda `http://localhost:8000` adresini aç
2. Harita yüklenecek
3. Sol panelde "Kahramanmaraş Necip Fazıl Şehir Hastanesi" görünecek
4. Marker'a tıklayınca popup açılacak

## ✅ Başarılı Kurulum Kontrol Listesi

- [ ] Harita görünüyor
- [ ] Sol panelde "2 Tesis" yazıyor
- [ ] Filtreler çalışıyor
- [ ] Arama çalışıyor
- [ ] Marker'a tıklayınca popup açılıyor
- [ ] "Yol Tarifi Al" butonu Google Maps açıyor

## 🆘 Sorun Giderme

### Harita yüklenmiyor
- ✅ İnternet bağlantınızı kontrol edin
- ✅ Tarayıcı konsolunu açın (F12) ve hata mesajlarını kontrol edin

### "Supabase yapılandırması gerekli" hatası
- ✅ `assets/js/config.js` dosyasındaki URL ve Key'i kontrol edin
- ✅ Tırnak işaretlerinin doğru olduğundan emin olun

### "Tesisler yüklenirken hata" mesajı
- ✅ Supabase SQL Editor'de `schema.sql` dosyasını çalıştırdığınızdan emin olun
- ✅ Supabase Dashboard > Table Editor'de tabloların oluştuğunu kontrol edin

### Marker'lar görünmüyor
- ✅ Tarayıcı konsolunda hata var mı kontrol edin
- ✅ Sayfayı yenileyin (F5)
- ✅ Cache'i temizleyin (Ctrl+Shift+Delete)

## 📱 Mobilde Test Etme

1. Bilgisayarınızın IP adresini öğrenin:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```

2. Mobil cihazınızda tarayıcıyı açın
3. `http://BILGISAYAR-IP:8000` adresini girin (örn: `http://192.168.1.100:8000`)
4. Uygulamayı ana ekrana ekleyin:
   - **Android:** Menü > Ana ekrana ekle
   - **iOS:** Paylaş > Ana Ekrana Ekle

## 🎯 Sonraki Adımlar

1. **Veri Ekleme:** `haritayonetim/index.html` sayfasından yeni tesisler ekleyin
2. **Özelleştirme:** `style.css` dosyasından renkleri değiştirin
3. **Deployment:** README.md dosyasındaki deployment talimatlarını izleyin

## 💡 İpuçları

- 🔄 Veritabanını sıfırlamak için SQL Editor'de `DROP TABLE` komutlarını çalıştırıp `schema.sql`'i tekrar çalıştırın
- 📊 Supabase Dashboard > Table Editor'den manuel veri ekleyebilirsiniz
- 🗺️ Geocoding için adres formatı: "Tesis Adı, İlçe, Kahramanmaraş"

## 📞 Yardım

Sorun yaşıyorsanız:
1. README.md dosyasını okuyun
2. Tarayıcı konsolunu kontrol edin (F12)
3. Supabase Dashboard'da tabloları kontrol edin

---

**Tebrikler! 🎉** Uygulamanız hazır. Artık sağlık tesislerini harita üzerinde görüntüleyebilirsiniz!
