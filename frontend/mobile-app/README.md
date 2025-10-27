# AyazLogistics Unified Mobile App

Role-based mobile application for all warehouse and logistics operations.

## Features

### Multi-Role Support
- **Warehouse Operator**: Receiving, shipping, pallet transfer, putaway, QC
- **Forklift Operator**: Pallet addressing, auto-picking tasks, RT/TT operations
- **Accountant**: Invoices, transactions, financial reports
- **Sales**: New customers, quotations, contracts
- **Supervisor**: Special operations, approvals, overrides
- **Admin**: Full system access

### Key Capabilities
- Barcode scanning
- Real-time task assignment
- GPS tracking integration
- Multi-language support (TR/EN)
- Offline mode support
- Photo capture for QC
- Digital signatures
- Real-time notifications

## Demo Credentials

```
Warehouse Operator: depocu@ayaz.com / 123456
Forklift Operator: forklift@ayaz.com / 123456
Accountant: muhasebe@ayaz.com / 123456
Sales Rep: satis@ayaz.com / 123456
Supervisor: supervisor@ayaz.com / 123456
Admin: admin@ayaz.com / 123456
```

## Installation

```bash
npm install
npm run android  # For Android
npm run ios      # For iOS
```

## Tech Stack
- React Native 0.73
- TypeScript
- React Navigation
- Axios (API client)
- AsyncStorage (local data)
- React Native Camera (barcode scanning)
- React Native Maps (GPS tracking)

## Role-Based Menu System

Each role sees different menu items based on their permissions:

### Warehouse Operator Menu
- 📥 Mal Kabul (Receiving)
- 📤 Sevkiyat (Shipping)
- 🔄 Palet Transfer
- 📍 Yerleştirme (Putaway)
- ✓ Kalite Kontrol (QC)

### Forklift Operator Menu
- 🏷️ Palet Adresleme
- 🤖 Otomatik Toplama
- 🚜 RT İşlemleri
- 🏗️ TT İşlemleri

### Accountant Menu
- 💰 Faturalar (Invoices)
- 💳 İşlemler (Transactions)
- 📊 Mali Raporlar (Financial Reports)

### Sales Menu
- 👤 Yeni Müşteri (New Customer)
- 📝 Teklif Çıkar (Create Quote)
- 📋 Sözleşmeler (Contracts)

### Supervisor Menu
- All warehouse operations
- Special supervisor operations
- Approval workflows

### Admin Menu
- Full system access
- All modules
- System configuration

## API Integration

```typescript
const API_URL = 'http://localhost:3000/api/v1';

// Login
POST /auth/login

// Warehouse Operations
GET /wms/warehouses
POST /wms/receiving
POST /wms/picking
POST /wms/shipping

// Forklift Operations
POST /wms/forklift/rt-task
POST /wms/forklift/tt-task

// Supervisor Operations
POST /wms/supervisor/block-pallet
POST /wms/supervisor/modify-pallet-lot-date
```

## Screens

Total: 20+ screens covering all roles and operations

### Common Screens
- Login
- Home (role-based)

### Warehouse Operator Screens (5)
- Receiving (4-step workflow)
- Shipping
- Pallet Transfer
- Putaway (with AI suggestions)
- Quality Check

### Forklift Operator Screens (4)
- Pallet Addressing
- Auto Picking Tasks
- RT Operations
- TT Operations

### Accountant Screens (3)
- Invoices
- Transactions
- Financial Reports

### Sales Screens (3)
- New Customer
- Quotation
- Contracts

### Supervisor Screens (1+)
- Supervisor Operations Hub

### Admin Screens (1+)
- Admin Dashboard (all modules)

## Features Implemented

✅ Role-based authentication
✅ Dynamic menu system
✅ Barcode scanning simulation
✅ Multi-step workflows
✅ Real-time data display
✅ Responsive UI
✅ iOS-inspired design
✅ Turkish/English bilingual
✅ Task management
✅ Performance tracking
✅ Photo capture (QC)
✅ Suggested locations (AI)
✅ Progress tracking

## License
Proprietary - AyazLogistics

