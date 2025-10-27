# Ayaz Logistics Driver Mobile App

Sürücülerin görev yönetimi, rota takibi ve teslimat işlemleri için geliştirilmiş React Native mobil uygulaması.

## 🌟 Özellikler

### 📋 Görev Yönetimi
- ✅ Gerçek zamanlı görev atama ve kabul
- ✅ Priority-based task sorting
- ✅ Task status tracking (bekleyen, devam eden, tamamlanan)
- ✅ Görev detayları ve gereksinimler
- ✅ Customer contact information

### 🗺️ Navigasyon ve Rota
- ✅ GPS konum takibi
- ✅ Rota optimizasyonu
- ✅ Multiple stop management
- ✅ Turn-by-turn navigation integration
- ✅ Offline map support

### 📸 Kamera ve Dokümantasyon
- ✅ Delivery proof photos
- ✅ Barcode/QR code scanning
- ✅ Signature capture
- ✅ Document upload
- ✅ Photo gallery management

### 💰 Performans ve Kazanç
- ✅ Daily earnings tracking
- ✅ Performance metrics
- ✅ Rating system
- ✅ Payment history
- ✅ Bonus calculations

### 🛠️ Teknik Özellikler
- ✅ Offline-first architecture
- ✅ Real-time synchronization
- ✅ Push notifications
- ✅ Background location tracking
- ✅ Battery optimization

## 📱 Screenshots

[TODO: Add screenshots when available]

## 🛠️ Kurulum

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- React Native development environment
- Location permissions for GPS features

### Installation Steps

1. **Repository'yi klonlayın:**
```bash
git clone <repository-url>
cd mobile-apps/driver-app
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment variables'ı ayarlayın:**
```bash
cp .env.example .env
# Edit .env file with your API endpoints and permissions
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
├── components/          # UI bileşenleri
│   ├── ui/             # Temel componentler
│   ├── tasks/          # Görev componentleri
│   └── navigation/     # Navigasyon componentleri
├── screens/            # Ana ekranlar
│   ├── HomeScreen.tsx
│   ├── TasksScreen.tsx
│   ├── RoutesScreen.tsx
│   └── ProfileScreen.tsx
├── services/           # API ve servisler
│   ├── api.service.ts  # Backend API
│   ├── location.service.ts
│   ├── camera.service.ts
│   └── barcode.service.ts
├── contexts/           # State management
│   ├── AuthContext.tsx
│   └── TaskContext.tsx
├── navigation/         # Navigation yapısı
├── styles/             # Tema ve styling
├── types/              # TypeScript types
├── utils/              # Yardımcı fonksiyonlar
└── hooks/              # Custom hooks
```

## 🔧 API Entegrasyonu

### Authentication
```typescript
import apiService from './src/services/api.service';

// Login
const loginResponse = await apiService.login(email, password);
```

### Görev Yönetimi
```typescript
// Get assigned tasks
const tasks = await apiService.getDriverTasks();

// Accept task
await apiService.acceptTask(taskId);

// Complete task
await apiService.completeTask(taskId, { photos: [...], signature: '...' });
```

### Location Tracking
```typescript
import locationService from './src/services/location.service';

// Start location tracking
locationService.startTracking();

// Update current location
await apiService.updateLocation({ lat, lng, timestamp });
```

## 🎨 Tema ve Styling

Corporate design system:

```typescript
import { Colors, Spacing, Typography } from './src/styles/theme';

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    elevation: 3,
  },
});
```

## 🚀 Deployment

### Development
```bash
npm start
# Test on device with Expo Go app
```

### Production Build
```bash
# EAS Build (Recommended)
eas build --platform android
eas build --platform ios

# Traditional
expo build:android
expo build:ios
```

### Store Release
1. Background location permissions ekleme
2. Camera permissions ayarlama
3. Code signing ve certificates
4. App Store / Google Play review süreci

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Task acceptance flow
- [ ] GPS tracking
- [ ] Camera functionality
- [ ] Offline mode
- [ ] Push notifications
- [ ] Background location

## 🔒 Security

- JWT authentication
- Secure location data handling
- Camera permission management
- Background task restrictions
- Data encryption at rest

## 📊 Performance

- Background location optimization
- Battery-efficient tracking
- Offline data sync
- Image compression
- Bundle size optimization

## 🗺️ Maps Integration

### Google Maps (Primary)
```typescript
// Google Maps SDK
import MapView from 'react-native-maps';
```

### Yandex Maps (Alternative)
```typescript
// Yandex Maps SDK
import YandexMap from 'react-native-yandex-mapkit';
```

## 📷 Camera Integration

```typescript
import cameraService from './src/services/camera.service';

// Take delivery photo
const photo = await cameraService.takePhoto();

// Scan barcode
const barcode = await cameraService.scanBarcode();
```

## 🌍 Internationalization

```typescript
// src/i18n/translations.ts
export const tr = {
  common: {
    accept: 'Kabul Et',
    decline: 'Reddet',
    complete: 'Tamamla',
  },
  tasks: {
    newTask: 'Yeni Görev',
    inProgress: 'Devam Ediyor',
    completed: 'Tamamlandı',
  },
  navigation: {
    start: 'Navigasyonu Başlat',
    continue: 'Devam Et',
  },
};
```

## ⚡ Background Tasks

```typescript
// Location tracking in background
AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    locationService.startBackgroundTracking();
  }
});
```

## 📞 Support

Destek için: driver@ayazlogistics.com

## 📝 Changelog

### v1.0.0
- Initial release
- Task management system
- GPS tracking
- Camera integration
- Real-time updates

## 📄 License

Bu uygulama Ayaz Logistics tarafından geliştirilmiştir.
