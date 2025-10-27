# Ayaz Logistics Mobile Apps

Bu dizin Ayaz Logistics için geliştirilen mobil uygulamaları içerir.

## 📱 Uygulamalar

### Customer App (Müşteri Uygulaması)
Müşterilerin kargo takibi, fatura yönetimi ve destek talepleri için React Native uygulaması.

**Özellikler:**
- ✅ Gerçek zamanlı kargo takibi
- ✅ Fatura görüntüleme ve indirme
- ✅ Profil yönetimi
- ✅ Push notification desteği
- ✅ Offline-first mimari
- ✅ Çoklu dil desteği (i18n)
- ✅ Dark/Light tema

**Kurulum:**
```bash
cd mobile-apps/customer-app
npm install
npm start
```

### Driver App (Sürücü Uygulaması)
Sürücülerin görev yönetimi, rota takibi ve teslimat işlemleri için React Native uygulaması.

**Özellikler:**
- ✅ Görev kabul/red sistemi
- ✅ GPS konum takibi
- ✅ Rota optimizasyonu
- ✅ Push notification entegrasyonu
- ✅ Offline görev senkronizasyonu
- ✅ Kamera ve fotoğraf entegrasyonu
- ✅ Barcode/QR kod tarama
- ✅ Performans ve puanlama sistemi

**Kurulum:**
```bash
cd mobile-apps/driver-app
npm install
npm start
```

### Unified App (Birleşik Uygulama)
Tüm rolleri (Admin, Driver, Customer, Warehouse) destekleyen kapsamlı React Native uygulaması.

**Özellikler:**
- ✅ Role-based navigation
- ✅ Corporate tema desteği
- ✅ Real-time data synchronization
- ✅ Advanced analytics
- ✅ Multi-language support
- ✅ Offline-first architecture

**Kurulum:**
```bash
cd mobile-apps/unified-app
npm install
npm start
```

## 🛠️ Tech Stack

- **Framework:** React Native 0.73.0
- **Platform:** Expo SDK 50
- **Navigation:** React Navigation v6
- **State Management:** React Context + AsyncStorage
- **HTTP Client:** Axios
- **UI Components:** React Native Heroicons
- **Styling:** StyleSheet API
- **Type Safety:** TypeScript

## 📋 Geliştirme Gereksinimleri

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (Android development)
- Xcode (iOS development)

### Development Setup
1. Repository'yi klonlayın
2. Bağımlılıkları yükleyin: `npm install`
3. Environment variables'ı ayarlayın
4. Expo development server'ı başlatın: `npm start`

## 🔧 API Entegrasyonu

Tüm mobil uygulamalar backend API ile şu endpoint'ler üzerinden iletişim kurar:

### Authentication
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/logout` - Çıkış

### Customer Endpoints
- `GET /api/customer/profile` - Profil bilgileri
- `GET /api/tracking/{trackingNumber}` - Kargo takibi
- `GET /api/customer/shipments` - Kargo listesi
- `GET /api/customer/invoices` - Fatura listesi

### Driver Endpoints
- `GET /api/driver/tasks` - Görev listesi
- `POST /api/driver/tasks/{id}/accept` - Görev kabul
- `POST /api/driver/tasks/{id}/complete` - Görev tamamlama
- `POST /api/driver/location` - Konum güncelleme

## 🚀 Deployment

### Development
```bash
npm start
# QR kod ile cihazda test edin
```

### Production Build
```bash
# Android APK
npm run android:release

# iOS IPA
npm run ios:release

# Web build
npm run web:build
```

### App Store Deployment
1. Expo Application Services (EAS) Build
2. Code signing certificates
3. App Store Connect / Google Play Console

## 🔒 Security

- JWT token-based authentication
- Secure storage with AsyncStorage
- API request signing
- Certificate pinning (production)
- Biometric authentication support

## 📊 Performance

- Offline-first architecture
- Optimistic UI updates
- Image optimization
- Bundle splitting
- Lazy loading

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Detox tests
npm run test:detox
```

## 📚 Documentation

### Customer App
- [User Guide](./customer-app/README.md)
- [API Documentation](./customer-app/API.md)
- [Development Guide](./customer-app/DEVELOPMENT.md)

### Driver App
- [Driver Guide](./driver-app/README.md)
- [API Documentation](./driver-app/API.md)
- [Development Guide](./driver-app/DEVELOPMENT.md)

### Unified App
- [Admin Guide](./unified-app/README.md)
- [Component Library](./unified-app/COMPONENTS.md)
- [Architecture Guide](./unified-app/ARCHITECTURE.md)

## 🤝 Contributing

1. Feature branch oluşturun
2. Kod standartlarına uyun (ESLint, Prettier)
3. Test yazın
4. Pull request oluşturun

## 📄 License

Bu proje Ayaz Logistics tarafından geliştirilmiştir.

## 📞 Support

Destek için: support@ayazlogistics.com
