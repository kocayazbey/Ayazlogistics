# AyazLogistics Mobile App

**Role-Based Mobile Application** for AyazLogistics with offline support, biometric authentication, and comprehensive functionality.

## 🎯 Features

### Authentication
- ✅ Email/Password login
- ✅ Biometric authentication (Fingerprint, Face ID)
- ✅ Role-based access control
- ✅ JWT token management
- ✅ Offline authentication cache

### Role-Based Screens

#### 1️⃣ Forklift Operator
- **Pallet Addressing**: Scan and assign pallet locations
- **Incoming Orders**: View and process incoming orders
- **QR/Barcode Scanner**: Built-in camera scanning
- **Real-time Updates**: Live order status

#### 2️⃣ Warehouse Worker
- **Goods Receipt**: Process incoming goods with PO scanning
- **Shipment Processing**: Manage outgoing shipments
- **Inventory Management**: Stock level checks
- **Priority-based Task List**: Urgent/High/Normal priority

#### 3️⃣ Accountant
- **Invoice Management**: View, create, and manage invoices
- **Payment Processing**: Process incoming/outgoing payments
- **Financial Reports**: Revenue and payment summaries
- **Multi-status Tracking**: Paid, Pending, Overdue invoices

#### 4️⃣ HR Manager
- **Employee Management**: View and manage employee records
- **Leave Approval**: Approve/reject leave requests
- **Attendance Tracking**: Real-time attendance overview
- **Performance Metrics**: Employee performance dashboards

#### 5️⃣ Sales Representative
- **Opportunity Pipeline**: Manage sales opportunities
- **Customer Management**: Customer profiles and history
- **Deal Tracking**: Stage-based opportunity tracking
- **Revenue Analytics**: Sales performance metrics

## 📱 Technology Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation 6
- **State Management**: React Context API
- **Storage**: AsyncStorage
- **Authentication**: JWT + Biometric
- **Camera**: Expo Camera + Barcode Scanner
- **Maps**: React Native Maps
- **Icons**: React Native Heroicons
- **Notifications**: Expo Notifications
- **Offline Support**: Network detection + queue

## 🚀 Installation

```bash
# Install dependencies
npm install

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

## 📋 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Forklift Operator | forklift@ayaz.com | 123456 |
| Warehouse Worker | warehouse@ayaz.com | 123456 |
| Accountant | accountant@ayaz.com | 123456 |
| HR Manager | hr@ayaz.com | 123456 |
| Sales Rep | sales@ayaz.com | 123456 |

## 🏗️ Project Structure

```
src/
├── contexts/          # React contexts (Auth)
├── navigation/        # Navigation config
├── screens/           # Screen components
│   ├── forklift/     # Forklift operator screens
│   ├── warehouse/    # Warehouse worker screens
│   ├── accounting/   # Accountant screens
│   ├── hr/           # HR manager screens
│   └── sales/        # Sales rep screens
├── services/          # Business logic services
│   ├── api.service.ts
│   ├── barcode.service.ts
│   ├── biometric.service.ts
│   ├── notification.service.ts
│   └── storage.service.ts
└── utils/            # Utility functions
```

## 🔐 Security

- JWT token encryption
- Biometric authentication
- Secure storage (AsyncStorage encrypted)
- Role-based access control
- API request signing

## 📡 Offline Support

- Automatic data caching
- Offline queue for failed requests
- Auto-sync when connection restored
- Local database for critical data

## 🔔 Push Notifications

- Real-time order updates
- Task assignments
- Payment confirmations
- Leave request status

## 🎨 UI/UX

- iOS-inspired design
- Dark mode support (planned)
- Gesture-based navigation
- Smooth animations
- Responsive layouts

## 🧪 Testing

```bash
# Run tests
npm test

# Run e2e tests
npm run test:e2e
```

## 📦 Build

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🌐 Backend API

Base URL: `http://localhost:3000/api`

### Endpoints

- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `POST /wms/pallet/scan` - Scan pallet
- `GET /wms/orders/incoming` - Get incoming orders
- `GET /billing/invoices` - Get invoices
- `GET /hr/employees` - Get employees
- `GET /crm/opportunities` - Get opportunities

## 📄 License

MIT License - AyazLogistics © 2024

