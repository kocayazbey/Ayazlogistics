# Ayaz Logistics Customer Mobile App

Müşterilerin kargo takibi, fatura yönetimi ve destek talepleri için geliştirilmiş React Native mobil uygulaması.

## 🌟 Özellikler

### 🚚 Kargo Takibi
- ✅ Gerçek zamanlı kargo durumu takibi
- ✅ Detaylı rota ve teslimat bilgileri
- ✅ Push notification ile güncelleme bildirimleri
- ✅ Offline kargo durumu görüntüleme
- ✅ QR kod ile kargo teslim alma

### 📄 Fatura Yönetimi
- ✅ Fatura görüntüleme ve detayları
- ✅ PDF indirme ve paylaşma
- ✅ Ödeme durumu takibi
- ✅ Fatura geçmişi ve arşiv

### 👤 Profil ve Ayarlar
- ✅ Profil bilgileri yönetimi
- ✅ Bildirim tercihleri
- ✅ Çoklu dil desteği (Türkçe/English)
- ✅ Dark/Light tema seçimi
- ✅ Güvenlik ayarları

### 🛠️ Teknik Özellikler
- ✅ Offline-first mimari
- ✅ JWT token authentication
- ✅ Responsive design
- ✅ Accessibility support
- ✅ Performance optimization

## 📱 Screenshots

[TODO: Add screenshots when available]

## 🛠️ Kurulum

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- React Native development environment

### Installation Steps

1. **Repository'yi klonlayın:**
```bash
git clone <repository-url>
cd mobile-apps/customer-app
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment variables'ı ayarlayın:**
```bash
cp .env.example .env
# Edit .env file with your API endpoints
```

4. **Development server'ı başlatın:**
```bash
npm start
```

5. **Test için:**
   - iOS Simulator: `npm run ios`
   - Android Emulator: `npm run android`
   - Web: `npm run web`

## 📁 Proje Yapısı

```
src/
├── components/          # Yeniden kullanılabilir UI bileşenleri
│   ├── ui/             # Temel UI componentler
│   └── common/         # Genel componentler
├── screens/            # Ana uygulama ekranları
│   ├── HomeScreen.tsx
│   ├── TrackingScreen.tsx
│   ├── InvoicesScreen.tsx
│   └── ProfileScreen.tsx
├── services/           # API ve external servisler
│   ├── api.service.ts  # Backend API entegrasyonu
│   └── storage.service.ts
├── contexts/           # React Context'ler
│   └── AuthContext.tsx # Authentication state management
├── navigation/         # Navigation yapısı
├── styles/             # Tema ve styling
│   └── theme.ts        # Corporate theme
├── types/              # TypeScript type definitions
├── utils/              # Yardımcı fonksiyonlar
└── hooks/              # Custom React hooks
```

## 🔧 API Entegrasyonu

### Authentication
```typescript
import apiService from './src/services/api.service';

// Login
const loginResponse = await apiService.login(email, password);

// Register
const registerResponse = await apiService.register(userData);
```

### Kargo Takibi
```typescript
// Single shipment tracking
const trackingInfo = await apiService.trackShipment(trackingNumber);

// Multiple shipments
const shipments = await apiService.getShipments(page, limit);
```

### Fatura Yönetimi
```typescript
// Get invoices
const invoices = await apiService.getInvoices(page, limit);

// Download invoice PDF
const pdfBlob = await apiService.downloadInvoice(invoiceId);
```

## 🎨 Tema ve Styling

Uygulama corporate design system kullanır:

```typescript
import { Colors, Spacing, Typography } from './src/styles/theme';

// Kullanım örneği
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text,
  },
});
```

## 🚀 Deployment

### Development Build
```bash
npm start
```

### Production Build
```bash
# EAS Build (Recommended)
eas build --platform android
eas build --platform ios

# Traditional build
npx expo build:android
npx expo build:ios
```

### App Store Release
1. EAS build ile APK/IPA oluştur
2. Code signing certificates ekle
3. App Store Connect / Google Play Console'a yükle

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Login/logout flow
- [ ] Kargo tracking
- [ ] Invoice download
- [ ] Offline mode
- [ ] Push notifications

## 🔒 Security

- JWT token-based authentication
- Secure AsyncStorage usage
- API request validation
- Certificate pinning (production)
- Input sanitization

## 📊 Performance

- Image optimization
- Bundle splitting
- Lazy loading
- Offline data caching
- Optimistic UI updates

## 🌍 Internationalization

```typescript
// src/i18n/translations.ts
export const tr = {
  common: {
    save: 'Kaydet',
    cancel: 'İptal',
    loading: 'Yükleniyor...',
  },
  tracking: {
    title: 'Kargo Takibi',
    status: 'Durum',
  },
};
```

## 📞 Support

Destek için: customer@ayazlogistics.com

## 📝 Changelog

### v1.0.0
- Initial release
- Kargo tracking
- Fatura yönetimi
- Profil sistemi
- Push notifications

## 📄 License

Bu uygulama Ayaz Logistics tarafından geliştirilmiştir.
