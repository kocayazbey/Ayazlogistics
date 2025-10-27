import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  AsyncStorage,
  I18nManager,
  Platform
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  warehouseId?: string;
  tenantId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error?: string;
}

interface LanguageState {
  currentLanguage: 'tr' | 'en' | 'de' | 'fr' | 'es';
  isRTL: boolean;
}

interface NavigationState {
  currentScreen: string;
  previousScreens: string[];
  screenParams: Record<string, any>;
  navigationHistory: string[];
}

interface SyncState {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingOperations: any[];
  syncInProgress: boolean;
  websocketConnected: boolean;
  lastHeartbeat: Date | null;
}

// WMS i18n translations
const WMS_TRANSLATIONS = {
  tr: {
    // Authentication
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    loginError: 'Giriş yapılırken hata oluştu',
    loginSuccess: 'Başarıyla giriş yapıldı',
    sessionExpired: 'Oturum süresi doldu',
    invalidCredentials: 'Geçersiz kimlik bilgileri',

    // Navigation
    menu: 'Menü',
    inventory: 'Stok',
    operations: 'Operasyonlar',
    receiving: 'Mal Kabul',
    picking: 'Toplama',
    shipping: 'Sevkiyat',
    reports: 'Raporlar',
    settings: 'Ayarlar',
    scan: 'Tara',
    search: 'Ara',

    // Inventory
    inventoryTitle: 'Stok Yönetimi',
    inventoryItems: 'Stok Kalemleri',
    lowStock: 'Düşük Stok',
    slowMoving: 'Yavaş Hareket Eden',
    stockAdjustment: 'Stok Düzeltme',
    stockTransfer: 'Stok Transferi',
    cycleCount: 'Sayım',
    abcAnalysis: 'ABC Analizi',

    // Operations
    operationsTitle: 'Operasyon Yönetimi',
    createOperation: 'Operasyon Oluştur',
    startOperation: 'Operasyonu Başlat',
    pauseOperation: 'Operasyonu Duraklat',
    resumeOperation: 'Operasyona Devam Et',
    completeOperation: 'Operasyonu Tamamla',
    cancelOperation: 'Operasyonu İptal Et',
    operationStatus: 'Operasyon Durumu',
    operationType: 'Operasyon Türü',

    // Receiving
    receivingTitle: 'Mal Kabul',
    newReceiving: 'Yeni Mal Kabul',
    receivingOrder: 'Mal Kabul Emri',
    supplier: 'Tedarikçi',
    expectedItems: 'Beklenen Kalemler',
    receivedItems: 'Alınan Kalemler',
    receivingComplete: 'Mal Kabul Tamamlandı',
    receivingCancel: 'Mal Kabul İptal',

    // Picking
    pickingTitle: 'Toplama',
    newPicking: 'Yeni Toplama',
    pickingOrder: 'Toplama Emri',
    pickingList: 'Toplama Listesi',
    pickItems: 'Kalemleri Topla',
    pickedItems: 'Toplanan Kalemler',
    pickingComplete: 'Toplama Tamamlandı',
    pickingCancel: 'Toplama İptal',

    // Shipping
    shippingTitle: 'Sevkiyat',
    newShipping: 'Yeni Sevkiyat',
    shipment: 'Sevkiyat',
    customer: 'Müşteri',
    shippingAddress: 'Teslimat Adresi',
    shipmentItems: 'Sevkiyat Kalemleri',
    shippingComplete: 'Sevkiyat Tamamlandı',
    shippingCancel: 'Sevkiyat İptal',

    // Common
    save: 'Kaydet',
    cancel: 'İptal',
    confirm: 'Onayla',
    delete: 'Sil',
    edit: 'Düzenle',
    view: 'Görüntüle',
    create: 'Oluştur',
    update: 'Güncelle',
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    warning: 'Uyarı',
    info: 'Bilgi',

    // Status
    pending: 'Bekliyor',
    inProgress: 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi',
    onHold: 'Beklemede',
    active: 'Aktif',
    inactive: 'Pasif',

    // Permissions
    noPermission: 'Bu işlem için yetkiniz yok',
    accessDenied: 'Erişim Reddedildi',

    // Network
    networkError: 'Ağ hatası oluştu',
    offlineMode: 'Çevrimdışı Mod',
    syncData: 'Verileri Senkronize Et',

    // Equipment
    forklift: 'Forklift',
    scanner: 'Tarayıcı',
    printer: 'Yazıcı',
    scale: 'Tartı',

    // WMS Operations
    scanBarcode: 'Barkod Tara',
    scanQR: 'QR Kod Tara',
    uploadPhoto: 'Fotoğraf Yükle',
    locationUpdate: 'Konum Güncelle',
    dashboard: 'Kontrol Paneli',
    employees: 'Çalışanlar',
    reports: 'Raporlar',
    analytics: 'Analitikler',
    updates: 'Güncellemeler',

    // WMS Specific
    palletScan: 'Palet Tarama',
    locationAssignment: 'Konum Atama',
    inventoryCount: 'Sayım',
    receivingOrder: 'Mal Kabul Emri',
    pickingOrder: 'Toplama Emri',
    shippingOrder: 'Sevkiyat Emri',
    cycleCount: 'Dönemsel Sayım',
    putaway: 'Yerleştirme',
    replenishment: 'İkmal',
    crossDocking: 'Çapraz Yerleştirme',

    // Status Messages
    scanComplete: 'Tarama Tamamlandı',
    operationSuccess: 'İşlem Başarılı',
    operationFailed: 'İşlem Başarısız',
    dataSync: 'Veri Senkronizasyonu',
    syncComplete: 'Senkronizasyon Tamamlandı',
    syncFailed: 'Senkronizasyon Başarısız',

    // Navigation
    back: 'Geri',
    next: 'İleri',
    finish: 'Bitir',
    continue: 'Devam Et',
    exit: 'Çıkış',
    home: 'Ana Sayfa',
    profile: 'Profil',

    // Permissions
    accessDenied: 'Erişim Reddedildi',
    insufficientPermissions: 'Yetersiz Yetkiler',
    permissionRequired: 'Yetki Gerekli',

    // Network
    connecting: 'Bağlanıyor...',
    connectionLost: 'Bağlantı Kesildi',
    retry: 'Tekrar Dene',
    offline: 'Çevrimdışı',
    online: 'Çevrimiçi',

    // Language
    language: 'Dil',
    selectLanguage: 'Dil Seçin',
    languageChanged: 'Dil Değiştirildi',
    turkish: 'Türkçe',
    english: 'İngilizce',
    german: 'Almanca',
    french: 'Fransızca',
    spanish: 'İspanyolca',
  },

  en: {
    // Authentication
    login: 'Login',
    logout: 'Logout',
    username: 'Username',
    password: 'Password',
    loginError: 'Login error occurred',
    loginSuccess: 'Login successful',
    sessionExpired: 'Session expired',
    invalidCredentials: 'Invalid credentials',

    // Navigation
    menu: 'Menu',
    inventory: 'Inventory',
    operations: 'Operations',
    receiving: 'Receiving',
    picking: 'Picking',
    shipping: 'Shipping',
    reports: 'Reports',
    settings: 'Settings',
    scan: 'Scan',
    search: 'Search',

    // Inventory
    inventoryTitle: 'Inventory Management',
    inventoryItems: 'Inventory Items',
    lowStock: 'Low Stock',
    slowMoving: 'Slow Moving',
    stockAdjustment: 'Stock Adjustment',
    stockTransfer: 'Stock Transfer',
    cycleCount: 'Cycle Count',
    abcAnalysis: 'ABC Analysis',

    // Operations
    operationsTitle: 'Operations Management',
    createOperation: 'Create Operation',
    startOperation: 'Start Operation',
    pauseOperation: 'Pause Operation',
    resumeOperation: 'Resume Operation',
    completeOperation: 'Complete Operation',
    cancelOperation: 'Cancel Operation',
    operationStatus: 'Operation Status',
    operationType: 'Operation Type',

    // Receiving
    receivingTitle: 'Receiving',
    newReceiving: 'New Receiving',
    receivingOrder: 'Receiving Order',
    supplier: 'Supplier',
    expectedItems: 'Expected Items',
    receivedItems: 'Received Items',
    receivingComplete: 'Receiving Complete',
    receivingCancel: 'Cancel Receiving',

    // Picking
    pickingTitle: 'Picking',
    newPicking: 'New Picking',
    pickingOrder: 'Picking Order',
    pickingList: 'Picking List',
    pickItems: 'Pick Items',
    pickedItems: 'Picked Items',
    pickingComplete: 'Picking Complete',
    pickingCancel: 'Cancel Picking',

    // Shipping
    shippingTitle: 'Shipping',
    newShipping: 'New Shipping',
    shipment: 'Shipment',
    customer: 'Customer',
    shippingAddress: 'Shipping Address',
    shipmentItems: 'Shipment Items',
    shippingComplete: 'Shipping Complete',
    shippingCancel: 'Cancel Shipping',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    create: 'Create',
    update: 'Update',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',

    // Status
    pending: 'Pending',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    onHold: 'On Hold',
    active: 'Active',
    inactive: 'Inactive',

    // Permissions
    noPermission: 'You do not have permission for this action',
    accessDenied: 'Access Denied',

    // Network
    networkError: 'Network error occurred',
    offlineMode: 'Offline Mode',
    syncData: 'Sync Data',

    // Equipment
    forklift: 'Forklift',
    scanner: 'Scanner',
    printer: 'Printer',
    scale: 'Scale',

    // WMS Operations
    scanBarcode: 'Scan Barcode',
    scanQR: 'Scan QR Code',
    uploadPhoto: 'Upload Photo',
    locationUpdate: 'Update Location',
    dashboard: 'Dashboard',
    employees: 'Employees',
    reports: 'Reports',
    analytics: 'Analytics',
    updates: 'Updates',

    // WMS Specific
    palletScan: 'Pallet Scan',
    locationAssignment: 'Location Assignment',
    inventoryCount: 'Inventory Count',
    receivingOrder: 'Receiving Order',
    pickingOrder: 'Picking Order',
    shippingOrder: 'Shipping Order',
    cycleCount: 'Cycle Count',
    putaway: 'Putaway',
    replenishment: 'Replenishment',
    crossDocking: 'Cross Docking',

    // Status Messages
    scanComplete: 'Scan Complete',
    operationSuccess: 'Operation Success',
    operationFailed: 'Operation Failed',
    dataSync: 'Data Sync',
    syncComplete: 'Sync Complete',
    syncFailed: 'Sync Failed',

    // Navigation
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    continue: 'Continue',
    exit: 'Exit',
    home: 'Home',
    profile: 'Profile',

    // Permissions
    accessDenied: 'Access Denied',
    insufficientPermissions: 'Insufficient Permissions',
    permissionRequired: 'Permission Required',

    // Network
    connecting: 'Connecting...',
    connectionLost: 'Connection Lost',
    retry: 'Retry',
    offline: 'Offline',
    online: 'Online',

    // Language
    language: 'Language',
    selectLanguage: 'Select Language',
    languageChanged: 'Language Changed',
    turkish: 'Turkish',
    english: 'English',
    german: 'German',
    french: 'French',
    spanish: 'Spanish',
  },

  de: {
    // Authentication
    login: 'Anmelden',
    logout: 'Abmelden',
    username: 'Benutzername',
    password: 'Passwort',
    loginError: 'Anmeldefehler aufgetreten',
    loginSuccess: 'Anmeldung erfolgreich',
    sessionExpired: 'Sitzung abgelaufen',
    invalidCredentials: 'Ungültige Anmeldedaten',

    // Navigation
    menu: 'Menü',
    inventory: 'Inventar',
    operations: 'Operationen',
    receiving: 'Wareneingang',
    picking: 'Kommissionierung',
    shipping: 'Versand',
    reports: 'Berichte',
    settings: 'Einstellungen',
    scan: 'Scannen',
    search: 'Suchen',

    // Inventory
    inventoryTitle: 'Inventarverwaltung',
    inventoryItems: 'Inventarartikel',
    lowStock: 'Niedriger Bestand',
    slowMoving: 'Langsam bewegend',
    stockAdjustment: 'Bestandsanpassung',
    stockTransfer: 'Bestandsübertragung',
    cycleCount: 'Zykluszählung',
    abcAnalysis: 'ABC-Analyse',

    // Operations
    operationsTitle: 'Operationsmanagement',
    createOperation: 'Operation erstellen',
    startOperation: 'Operation starten',
    pauseOperation: 'Operation pausieren',
    resumeOperation: 'Operation fortsetzen',
    completeOperation: 'Operation abschließen',
    cancelOperation: 'Operation abbrechen',
    operationStatus: 'Operationsstatus',
    operationType: 'Operationstyp',

    // Receiving
    receivingTitle: 'Wareneingang',
    newReceiving: 'Neuer Wareneingang',
    receivingOrder: 'Wareneingangsauftrag',
    supplier: 'Lieferant',
    expectedItems: 'Erwartete Artikel',
    receivedItems: 'Empfangene Artikel',
    receivingComplete: 'Wareneingang abgeschlossen',
    receivingCancel: 'Wareneingang abbrechen',

    // Picking
    pickingTitle: 'Kommissionierung',
    newPicking: 'Neue Kommissionierung',
    pickingOrder: 'Kommissionierauftrag',
    pickingList: 'Kommissionierliste',
    pickItems: 'Artikel kommissionieren',
    pickedItems: 'Kommissionierte Artikel',
    pickingComplete: 'Kommissionierung abgeschlossen',
    pickingCancel: 'Kommissionierung abbrechen',

    // Shipping
    shippingTitle: 'Versand',
    newShipping: 'Neuer Versand',
    shipment: 'Sendung',
    customer: 'Kunde',
    shippingAddress: 'Lieferadresse',
    shipmentItems: 'Versandartikel',
    shippingComplete: 'Versand abgeschlossen',
    shippingCancel: 'Versand abbrechen',

    // Common
    save: 'Speichern',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    delete: 'Löschen',
    edit: 'Bearbeiten',
    view: 'Anzeigen',
    create: 'Erstellen',
    update: 'Aktualisieren',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    warning: 'Warnung',
    info: 'Info',

    // Status
    pending: 'Ausstehend',
    inProgress: 'In Bearbeitung',
    completed: 'Abgeschlossen',
    cancelled: 'Abgebrochen',
    onHold: 'In Wartestellung',
    active: 'Aktiv',
    inactive: 'Inaktiv',

    // Permissions
    noPermission: 'Sie haben keine Berechtigung für diese Aktion',
    accessDenied: 'Zugriff verweigert',

    // Network
    networkError: 'Netzwerkfehler aufgetreten',
    offlineMode: 'Offline-Modus',
    syncData: 'Daten synchronisieren',

    // Equipment
    forklift: 'Gabelstapler',
    scanner: 'Scanner',
    printer: 'Drucker',
    scale: 'Waage',

    // WMS Operations
    scanBarcode: 'Barcode Scannen',
    scanQR: 'QR Code Scannen',
    uploadPhoto: 'Foto Hochladen',
    locationUpdate: 'Standort Aktualisieren',
    dashboard: 'Dashboard',
    employees: 'Mitarbeiter',
    reports: 'Berichte',
    analytics: 'Analytik',
    updates: 'Updates',

    // WMS Specific
    palletScan: 'Paletten-Scan',
    locationAssignment: 'Standort-Zuweisung',
    inventoryCount: 'Inventur',
    receivingOrder: 'Wareneingangsauftrag',
    pickingOrder: 'Kommissionierauftrag',
    shippingOrder: 'Versandauftrag',
    cycleCount: 'Zykluszählung',
    putaway: 'Einlagerung',
    replenishment: 'Nachschub',
    crossDocking: 'Cross-Docking',

    // Status Messages
    scanComplete: 'Scan Abgeschlossen',
    operationSuccess: 'Operation Erfolgreich',
    operationFailed: 'Operation Fehlgeschlagen',
    dataSync: 'Daten-Sync',
    syncComplete: 'Sync Abgeschlossen',
    syncFailed: 'Sync Fehlgeschlagen',

    // Navigation
    back: 'Zurück',
    next: 'Weiter',
    finish: 'Fertig',
    continue: 'Fortsetzen',
    exit: 'Beenden',
    home: 'Startseite',
    profile: 'Profil',

    // Permissions
    accessDenied: 'Zugriff Verweigert',
    insufficientPermissions: 'Unzureichende Berechtigungen',
    permissionRequired: 'Berechtigung Erforderlich',

    // Network
    connecting: 'Verbinde...',
    connectionLost: 'Verbindung Unterbrochen',
    retry: 'Erneut Versuchen',
    offline: 'Offline',
    online: 'Online',

    // Language
    language: 'Sprache',
    selectLanguage: 'Sprache Wählen',
    languageChanged: 'Sprache Geändert',
    turkish: 'Türkisch',
    english: 'Englisch',
    german: 'Deutsch',
    french: 'Französisch',
    spanish: 'Spanisch',
  },
};

// WMS Permission Constants
const WMS_PERMISSIONS = {
  // Warehouse Management
  WAREHOUSE_CREATE: 'wms.warehouse.create',
  WAREHOUSE_EDIT: 'wms.warehouse.edit',
  WAREHOUSE_DELETE: 'wms.warehouse.delete',
  WAREHOUSE_VIEW: 'wms.warehouse.view',

  // Location Management
  LOCATION_CREATE: 'wms.location.create',
  LOCATION_EDIT: 'wms.location.edit',
  LOCATION_DELETE: 'wms.location.delete',
  LOCATION_VIEW: 'wms.location.view',

  // Receiving
  RECEIVING_CREATE: 'wms.receiving.create',
  RECEIVING_EXECUTE: 'wms.receiving.execute',
  RECEIVING_COMPLETE: 'wms.receiving.complete',
  RECEIVING_CANCEL: 'wms.receiving.cancel',
  RECEIVING_VIEW: 'wms.receiving.view',

  // Picking
  PICKING_CREATE: 'wms.picking.create',
  PICKING_EXECUTE: 'wms.picking.execute',
  PICKING_COMPLETE: 'wms.picking.complete',
  PICKING_CANCEL: 'wms.picking.cancel',
  PICKING_VIEW: 'wms.picking.view',

  // Shipping
  SHIPPING_CREATE: 'wms.shipping.create',
  SHIPPING_SHIP: 'wms.shipping.ship',
  SHIPPING_CANCEL: 'wms.shipping.cancel',
  SHIPPING_VIEW: 'wms.shipping.view',

  // Inventory
  INVENTORY_VIEW: 'wms.inventory.view',
  INVENTORY_ADJUST: 'wms.inventory.adjust',
  INVENTORY_TRANSFER: 'wms.inventory.transfer',

  // Analytics & Reports
  REPORTS_VIEW: 'wms.reports.view',
  REPORTS_EXPORT: 'wms.reports.export',
  ANALYTICS_VIEW: 'wms.analytics.view',
};

// i18n Translation Function
const t = (key: string, language: LanguageState['currentLanguage'] = 'tr'): string => {
  const translations = WMS_TRANSLATIONS[language] || WMS_TRANSLATIONS.tr;
  return translations[key] || key;
};

// Language management functions
const getDeviceLanguage = (): LanguageState['currentLanguage'] => {
  const deviceLocale = Platform.select({
    ios: 'tr', // Default for iOS
    android: 'tr', // Default for Android
    default: 'tr'
  });

  // Map device locale to supported languages
  const supportedLanguages: Record<string, LanguageState['currentLanguage']> = {
    'tr': 'tr',
    'en': 'en',
    'de': 'de',
    'fr': 'fr',
    'es': 'es',
  };

  return supportedLanguages[deviceLocale] || 'tr';
};

const isRTLLanguage = (language: LanguageState['currentLanguage']): boolean => {
  // Add RTL languages here (Arabic, Hebrew, etc.)
  const rtlLanguages: LanguageState['currentLanguage'][] = [];
  return rtlLanguages.includes(language);
};

// Navigation management functions
const navigateToScreen = (
  screen: string,
  params: Record<string, any> = {},
  navigationState: NavigationState,
  setNavigationState: (state: NavigationState) => void
) => {
  const newNavigationState: NavigationState = {
    ...navigationState,
    currentScreen: screen,
    previousScreens: [...navigationState.previousScreens, navigationState.currentScreen].slice(-5),
    screenParams: params,
    navigationHistory: [...navigationState.navigationHistory, screen].slice(-20),
  };

  setNavigationState(newNavigationState);

  // Save navigation state to AsyncStorage for cross-app consistency
  AsyncStorage.setItem('navigationState', JSON.stringify(newNavigationState));
};

const goBack = (
  navigationState: NavigationState,
  setNavigationState: (state: NavigationState) => void
) => {
  if (navigationState.previousScreens.length > 0) {
    const previousScreen = navigationState.previousScreens[navigationState.previousScreens.length - 1];
    const newPreviousScreens = navigationState.previousScreens.slice(0, -1);

    const newNavigationState: NavigationState = {
      ...navigationState,
      currentScreen: previousScreen,
      previousScreens: newPreviousScreens,
      navigationHistory: navigationState.navigationHistory,
    };

    setNavigationState(newNavigationState);
    AsyncStorage.setItem('navigationState', JSON.stringify(newNavigationState));
  }
};

const resetNavigation = (
  navigationState: NavigationState,
  setNavigationState: (state: NavigationState) => void
) => {
  const resetState: NavigationState = {
    currentScreen: 'login',
    previousScreens: [],
    screenParams: {},
    navigationHistory: [],
  };

  setNavigationState(resetState);
  AsyncStorage.setItem('navigationState', JSON.stringify(resetState));
};

// WebSocket connection management
const initializeWebSocket = async (
  user: User | null,
  token: string | null,
  syncState: SyncState,
  setSyncState: (state: SyncState) => void
): Promise<void> => {
  if (!user || !token) {
    return;
  }

  try {
    // Close existing connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Create new WebSocket connection
    const socket = io('http://localhost:3000/realtime', {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setSyncState(prev => ({ ...prev, websocketConnected: true, lastHeartbeat: new Date() }));

      // Subscribe to WMS events
      socket.emit('wms:subscribe', {
        warehouseId: user.warehouseId,
        operationTypes: ['receiving', 'picking', 'shipping', 'inventory'],
        eventTypes: ['inventory_alert', 'operation_update', 'sync_completed'],
      });
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setSyncState(prev => ({ ...prev, websocketConnected: false }));
    });

    socket.on('wms:operation-updated', (data: any) => {
      console.log('Operation updated:', data);
      // Handle operation update - refresh relevant data
      handleOperationUpdate(data);
    });

    socket.on('wms:inventory-alert', (data: any) => {
      console.log('Inventory alert:', data);
      // Handle inventory alert - show notification
      handleInventoryAlert(data);
    });

    socket.on('wms:sync-completed', (data: any) => {
      console.log('Sync completed:', data);
      // Handle sync completion
      handleSyncCompletion(data);
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      setSyncState(prev => ({ ...prev, websocketConnected: false }));
    });

    // Heartbeat
    setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', { timestamp: new Date().toISOString() });
        setSyncState(prev => ({ ...prev, lastHeartbeat: new Date() }));
      }
    }, 30000);

    socketRef.current = socket;

  } catch (error) {
    console.error('WebSocket initialization error:', error);
    setSyncState(prev => ({ ...prev, websocketConnected: false }));
  }
};

const handleOperationUpdate = async (data: any) => {
  // Refresh relevant data based on operation type
  try {
    const response = await apiRequest(`wms/${data.operationType}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    // Update local storage
    await AsyncStorage.setItem(`last_${data.operationType}_data`, JSON.stringify(response));
  } catch (error) {
    console.error('Error refreshing operation data:', error);
  }
};

const handleInventoryAlert = (data: any) => {
  // Show alert notification
  Alert.alert(
    t('warning', languageState.currentLanguage),
    data.message,
    [{ text: t('ok', languageState.currentLanguage) }]
  );

  // Play notification sound if available
  // Vibration.vibrate();
};

const handleSyncCompletion = async (data: any) => {
  setSyncState(prev => ({
    ...prev,
    lastSyncTime: new Date(),
    pendingOperations: [],
    syncInProgress: false,
  }));

  await AsyncStorage.setItem('lastSyncTime', new Date().toISOString());
};

// Sync management functions
const syncWithServer = async (
  syncState: SyncState,
  setSyncState: (state: SyncState) => void,
  user: User | null,
  token: string | null
): Promise<boolean> => {
  if (!user || !token || !syncState.isOnline || !syncState.websocketConnected) {
    return false;
  }

  try {
    setSyncState({ ...syncState, syncInProgress: true });

    // Sync via WebSocket
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('wms:mobile-sync', {
        deviceId: user.id,
        lastSyncTime: syncState.lastSyncTime?.toISOString(),
        operations: syncState.pendingOperations,
      });

      return true;
    } else {
      // Fallback to HTTP sync
      const response = await apiRequest('mobile/sync', {
        method: 'POST',
        body: JSON.stringify({
          lastSyncTime: syncState.lastSyncTime,
          deviceId: user.id,
          operations: syncState.pendingOperations,
        }),
      });

      if (response.data) {
        await AsyncStorage.setItem('lastSyncData', JSON.stringify(response.data));
      }

      setSyncState({
        ...syncState,
        lastSyncTime: new Date(),
        pendingOperations: [],
        syncInProgress: false,
      });

      return true;
    }
  } catch (error) {
    console.error('Sync error:', error);
    setSyncState({ ...syncState, syncInProgress: false });
    return false;
  }
};

const addPendingOperation = (
  operation: any,
  syncState: SyncState,
  setSyncState: (state: SyncState) => void
) => {
  const newPendingOperations = [...syncState.pendingOperations, operation];
  setSyncState({ ...syncState, pendingOperations: newPendingOperations });
  AsyncStorage.setItem('pendingOperations', JSON.stringify(newPendingOperations));
};

const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Permission checking functions
const hasPermission = (user: User | null, requiredPermissions: string | string[]): boolean => {
  if (!user || !user.permissions) return false;

  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const userPermissions = user.permissions;

  // Admin has all permissions
  if (userPermissions.includes('all') || userPermissions.includes('*')) return true;

  // Check if user has any of the required permissions
  return permissions.some(permission =>
    userPermissions.includes(permission) || userPermissions.includes('all')
  );
};

const hasAnyRole = (user: User | null, roles: string[]): boolean => {
  if (!user || !user.role) return false;
  return roles.includes(user.role);
};

// API request wrapper with auth and permission checks
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  requiredPermissions?: string | string[],
  requiredRoles?: string[]
): Promise<any> => {
  const { user, token } = authState;

  // Check authentication
  if (!token || !user) {
    throw new Error('Not authenticated');
  }

  // Check permissions
  if (requiredPermissions && !hasPermission(user, requiredPermissions)) {
    throw new Error('Insufficient permissions');
  }

  // Check roles
  if (requiredRoles && !hasAnyRole(user, requiredRoles)) {
    throw new Error('Insufficient role permissions');
  }

  try {
    const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshed = await refreshToken(refreshToken);
        if (refreshed) {
          // Retry with new token
          const retryResponse = await fetch(`http://localhost:3000/api/${endpoint}`, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${refreshed.token}`,
              ...options.headers,
            },
          });
          return await retryResponse.json();
        }
      }
      throw new Error('Authentication expired');
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

const refreshToken = async (refreshToken: string): Promise<{token: string, user: User} | null> => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      await AsyncStorage.setItem('authToken', data.accessToken);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      return { token: data.accessToken, user: data.user };
    }
    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
};

const App = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true
  });
  const [languageState, setLanguageState] = useState<LanguageState>({
    currentLanguage: 'tr',
    isRTL: false
  });
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: 'login',
    previousScreens: [],
    screenParams: {},
    navigationHistory: [],
  });
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    lastSyncTime: null,
    pendingOperations: [],
    syncInProgress: false,
    websocketConnected: false,
    lastHeartbeat: null,
  });
  const socketRef = useRef<Socket | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await initializeLanguage();
    await initializeNavigationState();
    await checkAuthState();
    await getCameraPermissions();
    await setupNetworkListener();
    await initializeSyncState();
  };

  const initializeLanguage = async () => {
    try {
      // Try to get saved language preference
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && ['tr', 'en', 'de', 'fr', 'es'].includes(savedLanguage)) {
        const lang = savedLanguage as LanguageState['currentLanguage'];
        setLanguageState({
          currentLanguage: lang,
          isRTL: isRTLLanguage(lang)
        });

        // Set RTL if needed
        if (isRTLLanguage(lang)) {
          I18nManager.forceRTL(true);
        }
      } else {
        // Use device language
        const deviceLang = getDeviceLanguage();
        setLanguageState({
          currentLanguage: deviceLang,
          isRTL: isRTLLanguage(deviceLang)
        });
      }
    } catch (error) {
      console.error('Language initialization error:', error);
    }
  };

  const initializeNavigationState = async () => {
    try {
      const savedNavigationState = await AsyncStorage.getItem('navigationState');
      if (savedNavigationState) {
        const parsedState = JSON.parse(savedNavigationState);
        setNavigationState(parsedState);
        setCurrentScreen(parsedState.currentScreen);
      }
    } catch (error) {
      console.error('Navigation state initialization error:', error);
    }
  };

  const initializeSyncState = async () => {
    try {
      // Check network connectivity
      const isOnline = await checkNetworkConnectivity();
      setSyncState(prev => ({ ...prev, isOnline }));

      // Load pending operations
      const savedPendingOperations = await AsyncStorage.getItem('pendingOperations');
      if (savedPendingOperations) {
        const pendingOps = JSON.parse(savedPendingOperations);
        setSyncState(prev => ({ ...prev, pendingOperations: pendingOps }));
      }

      // Load last sync time
      const savedLastSync = await AsyncStorage.getItem('lastSyncTime');
      if (savedLastSync) {
        setSyncState(prev => ({ ...prev, lastSyncTime: new Date(savedLastSync) }));
      }

      // Initialize WebSocket connection if user is authenticated
      if (authState.isAuthenticated && authState.user && authState.token) {
        await initializeWebSocket(authState.user, authState.token, syncState, setSyncState);
      }

      // Setup periodic sync
      setInterval(async () => {
        const currentIsOnline = await checkNetworkConnectivity();
        setSyncState(prev => ({ ...prev, isOnline: currentIsOnline }));

        if (currentIsOnline && authState.isAuthenticated) {
          await syncWithServer(syncState, setSyncState, authState.user, authState.token);
        }
      }, 30000); // Sync every 30 seconds

    } catch (error) {
      console.error('Sync state initialization error:', error);
    }
  };

  const setupNetworkListener = () => {
    // Network connectivity monitoring
    // This would typically use NetInfo from @react-native-community/netinfo
    // For now, we'll simulate offline detection
  };

  const changeLanguage = async (language: LanguageState['currentLanguage']) => {
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
      setLanguageState({
        currentLanguage: language,
        isRTL: isRTLLanguage(language)
      });

      // Update RTL if needed
      if (isRTLLanguage(language)) {
        I18nManager.forceRTL(true);
      } else {
        I18nManager.forceRTL(false);
      }

      // Show confirmation message
      Alert.alert(
        t('success', language),
        t('settings', language) + ' ' + t('update', language)
      );
    } catch (error) {
      console.error('Language change error:', error);
      Alert.alert(t('error', language), t('networkError', language));
    }
  };

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userString = await AsyncStorage.getItem('userData');
      const refreshToken = await AsyncStorage.getItem('refreshToken');

      if (token && userString) {
        const user = JSON.parse(userString);

        // Validate current token
        const isTokenValid = await validateToken(token);

        if (isTokenValid) {
        setAuthState({
          isAuthenticated: true,
          user,
          token,
          loading: false
        });
        setCurrentScreen('menu');

          // Initialize WebSocket connection
          await initializeWebSocket(user, token, syncState, setSyncState);
        } else if (refreshToken) {
          // Try to refresh token
          const refreshed = await refreshToken(refreshToken);
          if (refreshed) {
            setAuthState({
              isAuthenticated: true,
              user: refreshed.user,
              token: refreshed.token,
              loading: false
            });
            setCurrentScreen('menu');

            // Initialize WebSocket connection with refreshed token
            await initializeWebSocket(refreshed.user, refreshed.token, syncState, setSyncState);
          } else {
            // Refresh failed, logout
            await logout();
          }
        } else {
          // No valid token and no refresh token, logout
          await logout();
        }
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('Auth state check error:', error);
      setAuthState(prev => ({ ...prev, loading: false }));
      setCurrentScreen('login');
    }
  };

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
  };

  const login = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store both access and refresh tokens
        await AsyncStorage.setItem('authToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));

        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.accessToken,
          loading: false
        });
        setCurrentScreen('menu');

        // Initialize WebSocket connection
        await initializeWebSocket(data.user, data.accessToken, syncState, setSyncState);
      } else {
        Alert.alert('Hata', data.message || 'Giriş yapılamadı');
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const logout = async () => {
    // Close WebSocket connection
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear all auth data
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userData']);
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false
    });

    // Reset sync and navigation states
    setSyncState({
      isOnline: true,
      lastSyncTime: null,
      pendingOperations: [],
      syncInProgress: false,
      websocketConnected: false,
      lastHeartbeat: null,
    });

    resetNavigation(navigationState, setNavigationState);
    setCurrentScreen('login');
  };

  const scanBarcode = async (data: string) => {
    setScanMode(false);

    // Eğer controlled entry screen aktifse, handle item scan
    if (currentScreen === 'controlled-entry') {
      // ControlledEntryScreen'e barcode verisini direkt API'ye gönder
      try {
        const response = await fetch('http://localhost:3000/api/wms/controlled-entry/scan-item', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.token}`,
          },
          body: JSON.stringify({
            sessionId: 'current-session', // Bu session management ile düzeltilmeli
            barcode: data,
            quantity: 1
          }),
        });

        if (response.ok) {
          const result = await response.json();
          Alert.alert('Başarılı', result.message);
        } else {
          Alert.alert('Hata', 'Ürün taranamadı');
        }
      } catch (error) {
        Alert.alert('Hata', 'Sunucuya bağlanılamadı');
      }
    } else {
      // Diğer ekranlar için genel kullanım
      Alert.alert('Barkod Okundu', `Veri: ${data}`, [
        { text: 'Tamam', onPress: () => console.log('Scanned:', data) }
      ]);
    }
  };

  if (authState.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!authState.isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>AyazWMS Handheld</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>{authState.user?.name} ({authState.user?.role})</Text>
      </View>

      {scanMode ? (
        <BarcodeScanner onScan={scanBarcode} onCancel={() => setScanMode(false)} />
      ) : (
        <>
          {currentScreen === 'menu' && (
            <MainMenu
              user={authState.user!}
              onNavigate={setCurrentScreen}
              onScan={() => setScanMode(true)}
            />
          )}
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'receiving' && (
            <ReceivingScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'picking' && (
            <PickingScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'putaway' && (
            <PutawayScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'shipping' && (
            <ShippingScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'count' && (
            <CycleCountScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'supervisor' && (
            <SupervisorScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'picking-eye' && (
            <PickingEyeScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'picking-cart' && (
            <PickingCartScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'its-packaging' && (
            <ItsPackagingScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'auto-count' && (
            <AutoCountScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'controlled-entry' && (
            <ControlledEntryScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'forklift-rt-tt' && (
            <ForkliftRTScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'narrow-aisle' && (
            <NarrowAisleScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'location-assignment' && (
            <LocationAssignmentScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'incoming-orders' && (
            <IncomingOrdersScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
          {currentScreen === 'forklift' && (
            <ForkliftScreen
              onBack={() => setCurrentScreen('menu')}
              onScan={() => setScanMode(true)}
              user={authState.user!}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

// Enhanced WMS Dashboard Screen
const DashboardScreen = ({ onBack, onScan, user }: any) => {
  const [overview, setOverview] = useState<any>(null);
  const [operations, setOperations] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [realTime, setRealTime] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, operations, performance, alerts, realtime

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [overviewData, operationsData, performanceData, alertsData, realTimeData] = await Promise.all([
        fetch('http://localhost:3000/api/wms/dashboard/overview', { headers: { 'Authorization': `Bearer ${user.token}` } }),
        fetch('http://localhost:3000/api/wms/dashboard/operations', { headers: { 'Authorization': `Bearer ${user.token}` } }),
        fetch('http://localhost:3000/api/wms/dashboard/performance', { headers: { 'Authorization': `Bearer ${user.token}` } }),
        fetch('http://localhost:3000/api/wms/dashboard/alerts', { headers: { 'Authorization': `Bearer ${user.token}` } }),
        fetch('http://localhost:3000/api/wms/dashboard/real-time', { headers: { 'Authorization': `Bearer ${user.token}` } })
      ]);

      if (overviewData.ok) setOverview(await overviewData.json());
      if (operationsData.ok) setOperations(await operationsData.json());
      if (performanceData.ok) setPerformance(await performanceData.json());
      if (alertsData.ok) setAlerts(await alertsData.json());
      if (realTimeData.ok) setRealTime(await realTimeData.json());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
    setLoading(false);
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/dashboard/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === 'critical') return '🔴';
    if (severity === 'high') return '🟠';
    if (severity === 'medium') return '🟡';
    return '🔵';
  };

  const getAlertColor = (severity: string) => {
    if (severity === 'critical') return '#F44336';
    if (severity === 'high') return '#FF9800';
    if (severity === 'medium') return '#FFC107';
    return '#2196F3';
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>WMS Dashboard</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'overview' && styles.tabButtonTextActive]}>
            Genel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'operations' && styles.tabButtonActive]}
          onPress={() => setActiveTab('operations')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'operations' && styles.tabButtonTextActive]}>
            Operasyonlar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'performance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('performance')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'performance' && styles.tabButtonTextActive]}>
            Performans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'alerts' && styles.tabButtonActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'alerts' && styles.tabButtonTextActive]}>
            Uyarılar ({alerts.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            {activeTab === 'overview' && overview && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Günlük Özet</Text>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{overview.summary.totalOrders}</Text>
                    <Text style={styles.summaryLabel}>Toplam Sipariş</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{overview.summary.completedOrders}</Text>
                    <Text style={styles.summaryLabel}>Tamamlanan</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{overview.summary.totalShipments}</Text>
                    <Text style={styles.summaryLabel}>Sevkiyat</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryValue}>{overview.summary.accuracy}%</Text>
                    <Text style={styles.summaryLabel}>Doğruluk</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Aktif Uyarılar</Text>
                {overview.alerts.slice(0, 3).map((alert: any, index: number) => (
                  <View key={index} style={[styles.alertItem, { borderLeftColor: getAlertColor(alert.priority) }]}>
                    <Text style={styles.alertIcon}>{getAlertIcon(alert.type, alert.priority)}</Text>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTime}>{Math.floor((Date.now() - new Date(alert.timestamp).getTime()) / 60000)}dk önce</Text>
                    </View>
                  </View>
                ))}

                <Text style={styles.sectionTitle}>Performans Metrikleri</Text>
                <View style={styles.performanceGrid}>
                  <View style={styles.performanceItem}>
                    <Text style={styles.performanceValue}>{overview.performance.ordersPerHour}</Text>
                    <Text style={styles.performanceLabel}>Sipariş/Saat</Text>
                  </View>

                  <View style={styles.performanceItem}>
                    <Text style={styles.performanceValue}>{overview.performance.pickingAccuracy}%</Text>
                    <Text style={styles.performanceLabel}>Toplama Doğruluğu</Text>
                  </View>

                  <View style={styles.performanceItem}>
                    <Text style={styles.performanceValue}>{overview.performance.inventoryAccuracy}%</Text>
                    <Text style={styles.performanceLabel}>Envanter Doğruluğu</Text>
                  </View>
                </View>
              </View>
            )}

            {activeTab === 'operations' && operations && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Operasyon Durumu</Text>

                {Object.entries(operations.operations).map(([key, operation]: [string, any]) => (
                  <View key={key} style={styles.operationCard}>
                    <View style={styles.operationHeader}>
                      <Text style={styles.operationName}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                      <Text style={styles.operationStatus}>{operation.status}</Text>
                    </View>
                    <View style={styles.operationStats}>
                      <Text style={styles.operationStat}>Kuyruk: {operation.queue}</Text>
                      <Text style={styles.operationStat}>İşleniyor: {operation.processing}</Text>
                      <Text style={styles.operationStat}>Tamamlanan: {operation.completed}</Text>
                    </View>
                    <Text style={styles.operationEfficiency}>Verimlilik: %{operation.efficiency}</Text>
                  </View>
                ))}

                <Text style={styles.sectionTitle}>Kaynak Kullanımı</Text>

                <View style={styles.resourceCard}>
                  <Text style={styles.resourceTitle}>Personel</Text>
                  <Text style={styles.resourceText}>
                    Forklift Operatörleri: {operations.resources.forkliftOperators.active}/{operations.resources.forkliftOperators.total}
                  </Text>
                  <Text style={styles.resourceText}>
                    Depo Çalışanları: {operations.resources.warehouseWorkers.active}/{operations.resources.warehouseWorkers.total}
                  </Text>
                </View>

                <View style={styles.resourceCard}>
                  <Text style={styles.resourceTitle}>Ekipman</Text>
                  <Text style={styles.resourceText}>
                    Forkliftler: {operations.resources.equipment.forklifts.available}/{operations.resources.equipment.forklifts.total}
                  </Text>
                  <Text style={styles.resourceText}>
                    Tarayıcılar: {operations.resources.equipment.scanners.available}/{operations.resources.equipment.scanners.total}
                  </Text>
                  <Text style={styles.resourceText}>
                    Arabalar: {operations.resources.equipment.carts.available}/{operations.resources.equipment.carts.total}
                  </Text>
                </View>

                {operations.bottlenecks.length > 0 && (
                  <View style={styles.bottlenecksCard}>
                    <Text style={styles.bottlenecksTitle}>Darboğazlar</Text>
                    {operations.bottlenecks.map((bottleneck: any, index: number) => (
                      <Text key={index} style={styles.bottleneckText}>
                        • {bottleneck.area}: {bottleneck.issue}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'performance' && performance && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Performans Metrikleri</Text>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{performance.metrics.productivity.current}%</Text>
                    <Text style={styles.metricLabel}>Üretkenlik</Text>
                    <Text style={styles.metricTarget}>Hedef: {performance.metrics.productivity.target}%</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{performance.metrics.accuracy.current}%</Text>
                    <Text style={styles.metricLabel}>Doğruluk</Text>
                    <Text style={styles.metricTarget}>Hedef: {performance.metrics.accuracy.target}%</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{performance.metrics.efficiency.current}%</Text>
                    <Text style={styles.metricLabel}>Verimlilik</Text>
                    <Text style={styles.metricTarget}>Hedef: {performance.metrics.efficiency.target}%</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{performance.metrics.quality.current}%</Text>
                    <Text style={styles.metricLabel}>Kalite</Text>
                    <Text style={styles.metricTarget}>Hedef: {performance.metrics.quality.target}%</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Karşılaştırmalar</Text>

                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonTitle}>Geçen Haftaya Göre</Text>
                  <Text style={[styles.comparisonValue, performance.comparisons.vsLastWeek.productivity > 0 ? styles.positive : styles.negative]}>
                    Üretkenlik: {performance.comparisons.vsLastWeek.productivity > 0 ? '+' : ''}{performance.comparisons.vsLastWeek.productivity}%
                  </Text>
                  <Text style={[styles.comparisonValue, performance.comparisons.vsLastWeek.accuracy > 0 ? styles.positive : styles.negative]}>
                    Doğruluk: {performance.comparisons.vsLastWeek.accuracy > 0 ? '+' : ''}{performance.comparisons.vsLastWeek.accuracy}%
                  </Text>
                </View>

                <View style={styles.comparisonCard}>
                  <Text style={styles.comparisonTitle}>Hedefe Göre</Text>
                  <Text style={[styles.comparisonValue, performance.comparisons.vsTarget.productivity > 0 ? styles.positive : styles.negative]}>
                    Üretkenlik: {performance.comparisons.vsTarget.productivity > 0 ? '+' : ''}{performance.comparisons.vsTarget.productivity}%
                  </Text>
                  <Text style={[styles.comparisonValue, performance.comparisons.vsTarget.accuracy > 0 ? styles.positive : styles.negative]}>
                    Doğruluk: {performance.comparisons.vsTarget.accuracy > 0 ? '+' : ''}{performance.comparisons.vsTarget.accuracy}%
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'alerts' && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Aktif Uyarılar</Text>

                {alerts.length === 0 ? (
                  <Text style={styles.emptyText}>Aktif uyarı bulunmamaktadır</Text>
                ) : (
                  alerts.map((alert) => (
                    <View key={alert.id} style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.severity) }]}>
                      <View style={styles.alertHeader}>
                        <Text style={styles.alertIcon}>{getAlertIcon(alert.type, alert.severity)}</Text>
                        <View style={styles.alertInfo}>
                          <Text style={styles.alertTitle}>{alert.title}</Text>
                          <Text style={styles.alertLocation}>{alert.location}</Text>
                        </View>
                        <Text style={styles.alertTime}>{alert.timeSinceAlert}dk önce</Text>
                      </View>
                      <Text style={styles.alertMessage}>{alert.message}</Text>

                      {!alert.acknowledged && (
                        <TouchableOpacity
                          style={styles.acknowledgeButton}
                          onPress={() => acknowledgeAlert(alert.id)}
                        >
                          <Text style={styles.acknowledgeButtonText}>✓ Kabul Et</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// Login Screen Component
const LoginScreen = ({ onLogin }: { onLogin: (email: string, password: string) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir');
      return;
    }

    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
  };

  return (
    <View style={styles.loginContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      <View style={styles.loginHeader}>
        <Text style={styles.loginTitle}>AyazWMS</Text>
        <Text style={styles.loginSubtitle}>Handheld Terminal</Text>
      </View>

      <View style={styles.loginForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="E-posta adresinizi girin"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Şifrenizi girin"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.buttonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hintText}>Demo hesapları:</Text>
        <Text style={styles.hintText}>Forklift: forklift@ayaz.com / 123456</Text>
        <Text style={styles.hintText}>Warehouse: warehouse@ayaz.com / 123456</Text>
      </View>
    </View>
  );
};

// Role-based Main Menu Component
const MainMenu = ({ user, onNavigate, onScan }: any) => {
  const getMenuItemsForRole = (role: string) => {
    const allMenuItems = [
      { id: 'dashboard', icon: '📊', title: 'Dashboard', subtitle: 'WMS performans dashboard', roles: ['warehouse_worker', 'warehouse_manager', 'admin'] },
      { id: 'receiving', icon: '📥', title: 'Mal Kabul', subtitle: 'Mal kabul işlemleri', roles: ['warehouse_worker', 'admin'] },
      { id: 'controlled-entry', icon: '🔍', title: 'Kontrollü Giriş', subtitle: 'Detaylı giriş kontrolü', roles: ['warehouse_worker', 'admin'] },
      { id: 'picking', icon: '📦', title: 'Toplama', subtitle: 'Sipariş toplama', roles: ['warehouse_worker', 'admin'] },
      { id: 'picking-eye', icon: '👁️', title: 'Toplama Gözü', subtitle: 'Toplama gözü işlemleri', roles: ['warehouse_worker', 'admin'] },
      { id: 'picking-cart', icon: '🛒', title: 'Toplama Arabası', subtitle: 'T-etiket ve araba işlemleri', roles: ['warehouse_worker', 'forklift_operator', 'admin'] },
      { id: 'its-packaging', icon: '📦', title: 'İTS Kolileme', subtitle: 'Akıllı kolileme sistemi', roles: ['warehouse_worker', 'admin'] },
      { id: 'auto-count', icon: '🔄', title: 'Otomatik Sayım', subtitle: 'Akıllı sayım tetikleme', roles: ['warehouse_worker', 'admin'] },
      { id: 'forklift-rt-tt', icon: '🏗️', title: 'Forklift RT/TT', subtitle: 'RT/TT görev işlemleri', roles: ['forklift_operator', 'admin'] },
      { id: 'location-assignment', icon: '📍', title: 'Rafa Adresleme', subtitle: 'Palet yerleştirme görevleri', roles: ['forklift_operator', 'admin'] },
      { id: 'incoming-orders', icon: '📋', title: 'Gelen Siparişler', subtitle: 'Dock\'ta bekleyen siparişler', roles: ['forklift_operator', 'admin'] },
      { id: 'narrow-aisle', icon: '🚧', title: 'Dar Koridor', subtitle: 'Narrow aisle forklift', roles: ['forklift_operator', 'admin'] },
      { id: 'putaway', icon: '📍', title: 'Yerleştirme', subtitle: 'Raf yerleştirme', roles: ['warehouse_worker', 'forklift_operator', 'admin'] },
      { id: 'shipping', icon: '🚚', title: 'Sevkiyat', subtitle: 'Sevkiyat işlemleri', roles: ['warehouse_worker', 'admin'] },
      { id: 'count', icon: '🔢', title: 'Sayım', subtitle: 'Döngü sayımı', roles: ['warehouse_worker', 'admin'] },
      { id: 'supervisor', icon: '👨‍💼', title: 'Supervisor', subtitle: 'Özel işlemler', roles: ['admin'] },
      { id: 'forklift', icon: '🏗️', title: 'Forklift', subtitle: 'Forklift operasyonları', roles: ['forklift_operator', 'admin'] },
    ];

    return allMenuItems.filter(item => item.roles.includes(role) || item.roles.includes('admin'));
  };

  const menuItems = getMenuItemsForRole(user.role);

  return (
    <ScrollView style={styles.menu}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuHeaderText}>İşlemler</Text>
        <TouchableOpacity style={styles.scanButton} onPress={onScan}>
          <Text style={styles.scanButtonText}>📷 Tara</Text>
        </TouchableOpacity>
      </View>

      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuItem}
          onPress={() => onNavigate(item.id)}
        >
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// Barcode Scanner Component
const BarcodeScanner = ({ onScan, onCancel }: { onScan: (data: string) => void; onCancel: () => void }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    onScan(data);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.scannerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.scannerText}>Kamera izni alınıyor...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.scannerContainer}>
        <Text style={styles.scannerText}>Kamera izni reddedildi</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>İptal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={styles.scanner}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr, BarCodeScanner.Constants.BarCodeType.ean13]}
      >
        <View style={styles.scannerOverlay}>
          <View style={styles.scanArea} />
          <Text style={styles.scannerInstructions}>Barkodu çerçeve içine hizalayın</Text>
        </View>
      </BarCodeScanner>

      {scanned && (
        <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
          <Text style={styles.rescanButtonText}>Tekrar Tara</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>İptal</Text>
      </TouchableOpacity>
    </View>
  );
};

// Enhanced Receiving Screen with API integration
// Enhanced Auto Count Screen (Advanced Cycle Counting)
const AutoCountScreen = ({ onBack, onScan, user }: any) => {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [pendingCounts, setPendingCounts] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [countedItems, setCountedItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, triggers, statistics

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadTriggers(),
      loadPendingCounts(),
      loadStatistics()
    ]);
    setLoading(false);
  };

  const loadTriggers = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/triggers', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTriggers(data);
      }
    } catch (error) {
      console.error('Error loading triggers:', error);
    }
  };

  const loadPendingCounts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/pending', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingCounts(data);
      }
    } catch (error) {
      console.error('Error loading pending counts:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/statistics', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const startAutoCount = async (autoCount: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          autoCountId: autoCount.id,
          countType: 'full'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCount(autoCount);
        setSessionData(data);
        setCurrentStep(0);
        setCountedItems([]);
      } else {
        Alert.alert('Hata', data.message || 'Otomatik sayım başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const handleItemScan = async (barcode: string) => {
    if (!sessionData || !selectedCount) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/scan-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          barcode,
          countedQuantity: 1 // Default quantity, should be configurable
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCountedItems([...countedItems, data.item]);
        Alert.alert('Sayım Sonucu', data.message);
      } else {
        Alert.alert('Hata', data.message || 'Ürün sayılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const completeStep = async (stepId: number) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          stepId
        }),
      });

      if (response.ok) {
        setCurrentStep(stepId);
        if (stepId >= sessionData.steps.length) {
          finishAutoCount();
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const finishAutoCount = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/auto-count/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          finalData: {
            totalItems: countedItems.length,
            accurateCounts: countedItems.filter(item => item.qualityStatus === 'perfect' || item.qualityStatus === 'good').length,
            varianceItems: countedItems.filter(item => item.qualityStatus === 'requires_investigation').length,
            recountRequired: countedItems.filter(item => item.requiresRecount).length
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Otomatik Sayım Tamamlandı!', `${data.message}\nGenel Doğruluk: ${data.finalResult.overallAccuracy}%`, [
          { text: 'Tamam', onPress: () => {
            setSelectedCount(null);
            setSessionData(null);
            setCountedItems([]);
            setCurrentStep(0);
            loadPendingCounts();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error finishing auto count:', error);
    }
  };

  const createTrigger = async () => {
    Alert.alert('Tetikleyici Oluştur', 'Bu özellik yakında eklenecek');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Otomatik Sayım</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'pending' && styles.tabButtonTextActive]}>
            Bekleyen ({pendingCounts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'triggers' && styles.tabButtonActive]}
          onPress={() => setActiveTab('triggers')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'triggers' && styles.tabButtonTextActive]}>
            Tetikleyiciler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'statistics' && styles.tabButtonActive]}
          onPress={() => setActiveTab('statistics')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'statistics' && styles.tabButtonTextActive]}>
            İstatistikler
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {activeTab === 'pending' && (
          <View style={styles.form}>
            <Text style={styles.label}>Otomatik Tetiklenen Sayımlar</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : pendingCounts.length === 0 ? (
              <Text style={styles.emptyText}>Otomatik tetiklenen sayım bulunmamaktadır</Text>
            ) : (
              pendingCounts.map((count) => (
                <TouchableOpacity
                  key={count.id}
                  style={styles.autoCountCard}
                  onPress={() => startAutoCount(count)}
                >
                  <View style={styles.countHeader}>
                    <Text style={styles.countTrigger}>{count.triggerName}</Text>
                    <Text style={styles.countPriority}>{count.priority}</Text>
                  </View>
                  <Text style={styles.countLocation}>{count.location}</Text>
                  <Text style={styles.countItem}>{count.item.name} ({count.item.sku})</Text>
                  <Text style={styles.countDetails}>
                    Sistem: {count.item.currentStock} • Süre: {count.estimatedDuration}dk
                  </Text>
                  <Text style={styles.countTime}>
                    Tetiklenme: {Math.floor(count.timeSinceTrigger)}dk önce
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'triggers' && (
          <View style={styles.form}>
            <View style={styles.triggersHeader}>
              <Text style={styles.label}>Sayım Tetikleyicileri</Text>
              <TouchableOpacity style={styles.addTriggerButton} onPress={createTrigger}>
                <Text style={styles.addTriggerButtonText}>+ Tetikleyici Ekle</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : triggers.length === 0 ? (
              <Text style={styles.emptyText}>Sayım tetikleyicisi bulunmamaktadır</Text>
            ) : (
              triggers.map((trigger) => (
                <View key={trigger.id} style={styles.triggerCard}>
                  <View style={styles.triggerHeader}>
                    <Text style={styles.triggerName}>{trigger.name}</Text>
                    <Text style={styles.triggerStatus}>{trigger.status}</Text>
                  </View>
                  <Text style={styles.triggerDescription}>{trigger.description}</Text>
                  <Text style={styles.triggerValue}>Tetikleme: {trigger.triggerValue}
                    {trigger.type === 'percentage' ? '%' :
                     trigger.type === 'quantity' ? ' adet' :
                     trigger.type === 'time' ? ' gün' : ' gün'}
                  </Text>
                  <Text style={styles.triggerLocations}>
                    Konumlar: {trigger.locations.join(', ')}
                  </Text>
                  <Text style={styles.triggerStats}>
                    Tetiklenme: {trigger.triggerCount} kez • Son: {trigger.lastTriggered.toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'statistics' && (
          <View style={styles.form}>
            <Text style={styles.label}>Sayım İstatistikleri</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : !statistics ? (
              <Text style={styles.emptyText}>İstatistik verisi bulunmamaktadır</Text>
            ) : (
              <View style={styles.statisticsCard}>
                <Text style={styles.statisticsTitle}>Genel Performans</Text>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{statistics.averageAccuracy}%</Text>
                    <Text style={styles.statLabel}>Ortalama Doğruluk</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{statistics.averageDuration}dk</Text>
                    <Text style={styles.statLabel}>Ortalama Süre</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{statistics.totalCounts}</Text>
                    <Text style={styles.statLabel}>Toplam Sayım</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{statistics.triggerEfficiency}%</Text>
                    <Text style={styles.statLabel}>Tetikleyici Verimi</Text>
                  </View>
                </View>

                <Text style={styles.statisticsTitle}>En İyi Performans Gösteren Bölgeler</Text>
                <Text style={styles.topZones}>{statistics.topPerformingZones.join(', ')}</Text>

                <Text style={styles.statisticsTitle}>Öneriler</Text>
                {statistics.recommendations.map((rec: string, index: number) => (
                  <Text key={index} style={styles.recommendation}>• {rec}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {selectedCount && (
          <View style={styles.form}>
            <View style={styles.activeCountCard}>
              <Text style={styles.activeCountTitle}>Aktif Sayım: {selectedCount.triggerName}</Text>
              <Text style={styles.activeCountLocation}>{selectedCount.location}</Text>
              <Text style={styles.activeCountItem}>{selectedCount.item.name}</Text>
            </View>

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {currentStep >= 2 && (
              <View style={styles.countingSection}>
                <Text style={styles.label}>Sayım Sonuçları ({countedItems.length})</Text>

                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => onScan()}
                >
                  <Text style={styles.scanButtonText}>📷 Ürün Tara & Say</Text>
                </TouchableOpacity>

                {countedItems.map((item, index) => (
                  <View key={index} style={styles.countedItemCard}>
                    <Text style={styles.countedItemName}>{item.name}</Text>
                    <Text style={styles.countedItemSku}>{item.sku}</Text>
                    <View style={styles.countResult}>
                      <Text style={styles.systemQuantity}>Sistem: {item.systemQuantity}</Text>
                      <Text style={styles.countedQuantity}>Sayılan: {item.countedQuantity}</Text>
                      <Text style={[
                        styles.variance,
                        item.variance === 0 ? styles.varianceZero :
                        item.variance > 0 ? styles.variancePositive : styles.varianceNegative
                      ]}>
                        Fark: {item.variance > 0 ? '+' : ''}{item.variance} ({item.variancePercentage.toFixed(1)}%)
                      </Text>
                    </View>
                    <Text style={[
                      styles.qualityStatus,
                      item.qualityStatus === 'perfect' ? styles.qualityPerfect :
                      item.qualityStatus === 'good' ? styles.qualityGood :
                      item.qualityStatus === 'acceptable' ? styles.qualityAcceptable :
                      styles.qualityInvestigation
                    ]}>
                      {item.qualityStatus === 'perfect' ? '✅ Mükemmel' :
                       item.qualityStatus === 'good' ? '✅ İyi' :
                       item.qualityStatus === 'acceptable' ? '⚠️ Kabul Edilebilir' : '❌ İnceleme Gerekli'}
                    </Text>
                  </View>
                ))}

                {countedItems.some(item => item.requiresRecount) && (
                  <View style={styles.recountWarning}>
                    <Text style={styles.recountWarningText}>⚠️ Yeniden sayım gerekli ürünler var</Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedCount(null);
                setSessionData(null);
                setCountedItems([]);
                setCurrentStep(0);
              }}
            >
              <Text style={styles.secondaryButtonText}>← İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced ITS Packaging Screen (Intelligent Transportation System)
const ItsPackagingScreen = ({ onBack, onScan, user }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [createdBoxes, setCreatedBoxes] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scannedBox, setScannedBox] = useState<any>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/orders?status=pending', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const startPackaging = async (order: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          packagingStrategy: 'optimized'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(order);
        setSessionData(data);
        setCurrentStep(0);
      } else {
        Alert.alert('Hata', data.message || 'İTS kolileme başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const runOptimization = async () => {
    if (!sessionData || !selectedOrder) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          items: selectedOrder.items
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOptimizationResult(data.optimizationResult);
        setCurrentStep(1);
      } else {
        Alert.alert('Hata', 'Optimizasyon çalıştırılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const createBox = async (boxType: string, items: any[]) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/create-box', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          boxType,
          items,
          tLabel: `T-BOX-${Date.now()}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedBoxes([...createdBoxes, data]);
        Alert.alert('Başarılı', data.message);
      } else {
        Alert.alert('Hata', 'Koli oluşturulamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const scanBoxForVerification = async (boxId: string, barcode: string) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/scan-box', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          boxId,
          barcode
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScannedBox(data);
        Alert.alert('Doğrulama', `Kalite Skoru: ${data.verificationResult.qualityScore}%\n${data.message}`);
      } else {
        Alert.alert('Hata', 'Koli doğrulanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const completeStep = async (stepId: number) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          stepId
        }),
      });

      if (response.ok) {
        setCurrentStep(stepId);
        if (stepId >= sessionData.steps.length) {
          finishPackaging();
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const finishPackaging = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/its-packaging/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          finalData: {
            totalBoxes: createdBoxes.length,
            totalItems: createdBoxes.reduce((sum, box) => sum + box.totalQuantity, 0),
            totalWeight: createdBoxes.reduce((sum, box) => sum + box.totalWeight, 0),
            totalValue: createdBoxes.reduce((sum, box) => sum + (box.totalQuantity * 10), 0)
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('İTS Kolileme Tamamlandı!', `${data.message}\nVerimlilik: ${data.finalResult.packagingEfficiency}%`, [
          { text: 'Tamam', onPress: () => {
            setSelectedOrder(null);
            setSessionData(null);
            setOptimizationResult(null);
            setCreatedBoxes([]);
            setCurrentStep(0);
            loadOrders();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error finishing packaging:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>İTS Kolileme</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedOrder ? (
          <View style={styles.form}>
            <Text style={styles.label}>İTS Kolileme Siparişleri</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : orders.length === 0 ? (
              <Text style={styles.emptyText}>İTS kolileme siparişi bulunmamaktadır</Text>
            ) : (
              orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.packagingOrderCard}
                  onPress={() => startPackaging(order)}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.packagingPriority}>{order.priority}</Text>
                  </View>
                  <Text style={styles.orderCustomer}>{order.customer}</Text>
                  <Text style={styles.orderItems}>{order.totalItems} ürün • {order.totalWeight} kg</Text>
                  <Text style={styles.orderDestination}>{order.destination}</Text>
                  <Text style={styles.orderSpecial}>{order.specialInstructions}</Text>
                  <View style={styles.orderStats}>
                    <Text style={styles.orderBoxes}>Tahmini Koli: {order.estimatedBoxes}</Text>
                    <Text style={styles.orderTime}>Son: {Math.floor(order.timeToDeadline / 60)}sa</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.activeOrderCard}>
              <Text style={styles.activeOrderTitle}>İTS Kolileme: {selectedOrder.orderNumber}</Text>
              <Text style={styles.activeOrderCustomer}>{selectedOrder.customer}</Text>
              <Text style={styles.activeOrderDetails}>{selectedOrder.totalItems} ürün • {selectedOrder.totalWeight} kg</Text>
            </View>

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {currentStep === 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.label}>Sipariş Analizi</Text>
                <View style={styles.orderSummary}>
                  <Text style={styles.summaryText}>Toplam Ürün: {selectedOrder.totalItems}</Text>
                  <Text style={styles.summaryText}>Toplam Ağırlık: {selectedOrder.totalWeight} kg</Text>
                  <Text style={styles.summaryText}>Paketleme Tipi: {selectedOrder.packagingType}</Text>
                  <Text style={styles.summaryText}>Özel Talimatlar: {selectedOrder.specialInstructions}</Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => completeStep(1)}
                >
                  <Text style={styles.buttonText}>Analizi Tamamla</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep >= 1 && (
              <View style={styles.optimizationSection}>
                <Text style={styles.label}>Koli Optimizasyonu</Text>

                {!optimizationResult ? (
                  <View style={styles.optimizationInput}>
                    <Text style={styles.optimizationTitle}>İTS Optimizasyon Parametreleri</Text>
                    <Text style={styles.optimizationDesc}>
                      Sistem ürünleri otomatik olarak en uygun kolilere yerleştirecek
                    </Text>

                    <TouchableOpacity
                      style={styles.optimizeButton}
                      onPress={runOptimization}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.optimizeButtonText}>🎯 Optimizasyonu Çalıştır</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.optimizationResult}>
                    <Text style={styles.optimizationTitle}>Optimizasyon Sonuçları</Text>
                    <Text style={styles.optimizationEfficiency}>Verimlilik: %{optimizationResult.efficiency}</Text>

                    {optimizationResult.boxConfigurations.map((box: any, index: number) => (
                      <View key={index} style={styles.boxConfigCard}>
                        <Text style={styles.boxType}>{box.boxType} Koli</Text>
                        <Text style={styles.boxDetails}>{box.dimensions} • {box.count} adet</Text>
                        <Text style={styles.boxItems}>{box.items} ürün • {box.weight} kg</Text>

                        <TouchableOpacity
                          style={styles.createBoxButton}
                          onPress={() => createBox(box.boxType, selectedOrder.items.slice(0, box.items))}
                        >
                          <Text style={styles.createBoxButtonText}>📦 Koli Oluştur</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.optimizationSummary}>
                      <Text style={styles.summaryTitle}>Özet</Text>
                      <Text style={styles.summaryText}>Toplam Koli: {optimizationResult.totalBoxes}</Text>
                      <Text style={styles.summaryText}>Toplam Ağırlık: {optimizationResult.totalWeight} kg</Text>
                      <Text style={styles.summaryText}>Maliyet: {optimizationResult.cost} ₺</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {createdBoxes.length > 0 && (
              <View style={styles.boxesSection}>
                <Text style={styles.label}>Oluşturulan Koliler ({createdBoxes.length})</Text>

                {createdBoxes.map((box, index) => (
                  <View key={index} style={styles.createdBoxCard}>
                    <View style={styles.boxHeader}>
                      <Text style={styles.boxTLabel}>{box.tLabel}</Text>
                      <Text style={styles.boxType}>{box.boxType}</Text>
                    </View>
                    <Text style={styles.boxDimensions}>{box.dimensions}</Text>
                    <Text style={styles.boxQuantity}>{box.totalQuantity} ürün • {box.totalWeight} kg</Text>

                    <TouchableOpacity
                      style={styles.scanBoxButton}
                      onPress={() => onScan()}
                    >
                      <Text style={styles.scanBoxButtonText}>📷 Koli Tara & Doğrula</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {currentStep >= 5 && (
              <View style={styles.qualitySection}>
                <Text style={styles.label}>Kalite Kontrol</Text>

                <View style={styles.qualityChecks}>
                  <Text style={styles.qualityCheck}>✅ Tüm koliler etiketlendi</Text>
                  <Text style={styles.qualityCheck}>✅ Ağırlıklar doğrulandı</Text>
                  <Text style={styles.qualityCheck}>✅ Paketleme standartları uygulandı</Text>
                </View>

                <TouchableOpacity
                  style={styles.qualityButton}
                  onPress={() => completeStep(6)}
                >
                  <Text style={styles.qualityButtonText}>✅ Kalite Kontrolünü Tamamla</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep >= 6 && (
              <View style={styles.palletSection}>
                <Text style={styles.label}>Paletleme</Text>

                <View style={styles.palletInfo}>
                  <Text style={styles.palletText}>Koliler palete hazır</Text>
                  <Text style={styles.palletText}>Toplam: {createdBoxes.length} koli</Text>
                  <Text style={styles.palletText}>Toplam Ağırlık: {createdBoxes.reduce((sum, box) => sum + box.totalWeight, 0)} kg</Text>
                </View>

                <TouchableOpacity
                  style={styles.palletButton}
                  onPress={() => completeStep(7)}
                >
                  <Text style={styles.palletButtonText}>📦 Paletlemeye Gönder</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedOrder(null);
                setSessionData(null);
                setOptimizationResult(null);
                setCreatedBoxes([]);
                setCurrentStep(0);
              }}
            >
              <Text style={styles.secondaryButtonText}>← İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Picking Cart Screen (T-Label Operations)
const PickingCartScreen = ({ onBack, onScan, user }: any) => {
  const [carts, setCarts] = useState<any[]>([]);
  const [selectedCart, setSelectedCart] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transferMode, setTransferMode] = useState(false);
  const [targetCart, setTargetCart] = useState<any>(null);

  useEffect(() => {
    loadCarts();
  }, []);

  const loadCarts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts?status=available,active', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCarts(data);
      }
    } catch (error) {
      console.error('Error loading carts:', error);
    }
    setLoading(false);
  };

  const assignCart = async (cart: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          cartId: cart.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedCart(cart);
        setSessionData(data);
        setCurrentStep(0);
        loadCartItems(cart.id);
      } else {
        Alert.alert('Hata', data.message || 'Araba atanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const loadCartItems = async (cartId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/picking-carts/${cartId}/items`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCartItems(data);
      }
    } catch (error) {
      console.error('Error loading cart items:', error);
    }
  };

  const addItemToCart = async (itemId: string, quantity: number) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts/add-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          itemId,
          quantity,
          tLabel: `T-${Date.now()}`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Başarılı', data.message);
        loadCartItems(selectedCart.id);
      } else {
        Alert.alert('Hata', 'Ürün arabaya eklenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const initiateTransfer = (transferType: 'merge' | 'split' | 'move') => {
    setTransferMode(true);
    // Show available carts for transfer
    const availableCarts = carts.filter(cart => cart.id !== selectedCart.id && cart.status === 'available');
    if (availableCarts.length === 0) {
      Alert.alert('Hata', 'Transfer için uygun araba bulunmamaktadır');
      setTransferMode(false);
      return;
    }
    setTargetCart(availableCarts[0]);
  };

  const executeTransfer = async (transferType: 'merge' | 'split' | 'move') => {
    if (!sessionData || !targetCart) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          targetCartId: targetCart.id,
          transferType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Başarılı', data.message);
        setTransferMode(false);
        setTargetCart(null);
        loadCartItems(selectedCart.id);
      }
    } catch (error) {
      Alert.alert('Hata', 'Transfer işlemi başarısız');
    }
  };

  const loadCart = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          vehicleId: 'VEH-001',
          dockId: 'DOCK-01'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Başarılı', data.message);
        setCurrentStep(4);
      }
    } catch (error) {
      Alert.alert('Hata', 'Yükleme işlemi başarısız');
    }
  };

  const performFinalControl = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts/final-control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          controlData: {
            itemsChecked: cartItems.length,
            weightVerified: true,
            labelsVerified: true
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Kontrol Tamamlandı', `Kalite Skoru: ${data.qualityScore}%\nT-Label: ${data.finalTLabel}`);
        setCurrentStep(5);
      }
    } catch (error) {
      Alert.alert('Hata', 'Final kontrol başarısız');
    }
  };

  const completeCart = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-carts/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          finalData: {
            totalItems: cartItems.length,
            totalWeight: cartItems.reduce((sum, item) => sum + item.weight, 0),
            totalValue: cartItems.reduce((sum, item) => sum + (item.quantity * 10), 0)
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('İşlem Tamamlandı!', `${data.message}\nPerformans: ${data.performance.efficiency}%`, [
          { text: 'Tamam', onPress: () => {
            setSelectedCart(null);
            setSessionData(null);
            setCartItems([]);
            setCurrentStep(0);
            loadCarts();
          }}
        ]);
      }
    } catch (error) {
      Alert.alert('Hata', 'Araba tamamlama işlemi başarısız');
    }
  };

  const completeStep = (stepId: number) => {
    setCurrentStep(stepId);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Toplama Arabası</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedCart ? (
          <View style={styles.form}>
            <Text style={styles.label}>Mevcut Toplama Arabaları</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : carts.length === 0 ? (
              <Text style={styles.emptyText}>Mevcut toplama arabası bulunmamaktadır</Text>
            ) : (
              carts.map((cart) => (
                <TouchableOpacity
                  key={cart.id}
                  style={styles.pickingCartCard}
                  onPress={() => assignCart(cart)}
                >
                  <View style={styles.cartHeader}>
                    <Text style={styles.cartNumber}>{cart.cartNumber}</Text>
                    <Text style={styles.cartStatus}>{cart.status}</Text>
                  </View>
                  <Text style={styles.cartName}>{cart.name}</Text>
                  <Text style={styles.cartLocation}>{cart.zone} - {cart.location}</Text>
                  <View style={styles.cartStats}>
                    <Text style={styles.cartWeight}>{cart.currentWeight}/{cart.maxWeight} kg</Text>
                    <Text style={styles.cartItems}>{cart.currentItems} ürün</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.activeCartCard}>
              <Text style={styles.activeCartTitle}>{selectedCart.name}</Text>
              <Text style={styles.activeCartNumber}>{selectedCart.cartNumber}</Text>
              <Text style={styles.activeCartLocation}>{selectedCart.zone} - {selectedCart.location}</Text>
              <Text style={styles.activeCartWeight}>{cartItems.reduce((sum, item) => sum + item.weight, 0).toFixed(1)} / {selectedCart.maxWeight} kg</Text>
            </View>

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {currentStep >= 1 && (
              <View style={styles.itemsSection}>
                <Text style={styles.label}>Arabadaki Ürünler ({cartItems.length})</Text>

                {cartItems.map((item) => (
                  <View key={item.id} style={styles.cartItemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemSku}>{item.sku}</Text>
                    </View>
                    <Text style={styles.itemTLabel}>T-Label: {item.tLabel}</Text>
                    <Text style={styles.itemQuantity}>Miktar: {item.quantity} • Ağırlık: {item.weight} kg</Text>
                    <Text style={styles.itemBatch}>Batch: {item.batchNumber} • SKT: {item.expiryDate}</Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => onScan()}
                >
                  <Text style={styles.addItemButtonText}>+ Ürün Tara / Ekle</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep >= 3 && !transferMode && (
              <View style={styles.transferSection}>
                <Text style={styles.label}>Transfer İşlemleri</Text>

                <TouchableOpacity
                  style={styles.transferButton}
                  onPress={() => initiateTransfer('merge')}
                >
                  <Text style={styles.transferButtonText}>🔗 Arabaları Birleştir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.transferButton}
                  onPress={() => initiateTransfer('split')}
                >
                  <Text style={styles.transferButtonText}>✂️ Arabayı Böl</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.transferButton}
                  onPress={() => initiateTransfer('move')}
                >
                  <Text style={styles.transferButtonText}>↔️ Araba Taşı</Text>
                </TouchableOpacity>
              </View>
            )}

            {transferMode && targetCart && (
              <View style={styles.transferModeSection}>
                <Text style={styles.label}>Hedef Araba: {targetCart.cartNumber}</Text>
                <TouchableOpacity
                  style={styles.confirmTransferButton}
                  onPress={() => executeTransfer('merge')}
                >
                  <Text style={styles.confirmTransferButtonText}>✅ Birleştirme Onayla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelTransferButton}
                  onPress={() => setTransferMode(false)}
                >
                  <Text style={styles.cancelTransferButtonText}>❌ İptal</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep >= 4 && (
              <TouchableOpacity
                style={styles.loadButton}
                onPress={loadCart}
              >
                <Text style={styles.loadButtonText}>📦 Arabayı Yükle</Text>
              </TouchableOpacity>
            )}

            {currentStep >= 5 && (
              <TouchableOpacity
                style={styles.controlButton}
                onPress={performFinalControl}
              >
                <Text style={styles.controlButtonText}>✅ Final Kontrol</Text>
              </TouchableOpacity>
            )}

            {currentStep >= 5 && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={completeCart}
              >
                <Text style={styles.completeButtonText}>🎉 İşlemi Tamamla</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedCart(null);
                setSessionData(null);
                setCartItems([]);
                setCurrentStep(0);
                setTransferMode(false);
                setTargetCart(null);
              }}
            >
              <Text style={styles.secondaryButtonText}>← İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Picking Eye Screen
const PickingEyeScreen = ({ onBack, onScan, user }: any) => {
  const [pickingEyes, setPickingEyes] = useState<any[]>([]);
  const [selectedEye, setSelectedEye] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [eyeItems, setEyeItems] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pickedItems, setPickedItems] = useState<any[]>([]);

  useEffect(() => {
    loadPickingEyes();
  }, []);

  const loadPickingEyes = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-eyes?status=available', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPickingEyes(data);
      }
    } catch (error) {
      console.error('Error loading picking eyes:', error);
    }
    setLoading(false);
  };

  const enterPickingEye = async (eye: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-eyes/enter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          pickingEyeId: eye.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedEye(eye);
        setSessionData(data);
        setCurrentStep(0);
        loadEyeItems(eye.id);
      } else {
        Alert.alert('Hata', data.message || 'Toplama gözüne giriş yapılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const loadEyeItems = async (eyeId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/picking-eyes/${eyeId}/items`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEyeItems(data);
      }
    } catch (error) {
      console.error('Error loading eye items:', error);
    }
  };

  const pickItem = async (item: any, quantity: number) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-eyes/pick-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          itemId: item.id,
          quantity,
          pickingEyeId: selectedEye.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPickedItems([...pickedItems, { ...item, quantity, pickedAt: new Date() }]);
        Alert.alert('Başarılı', data.message);
      } else {
        Alert.alert('Hata', 'Ürün toplanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const completeStep = async (stepId: number) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-eyes/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          stepId
        }),
      });

      if (response.ok) {
        setCurrentStep(stepId);
        if (stepId >= sessionData.steps.length) {
          exitPickingEye();
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const exitPickingEye = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-eyes/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          summary: {
            totalItems: pickedItems.length,
            totalQuantity: pickedItems.reduce((sum, item) => sum + item.quantity, 0)
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Başarılı', `${data.message}\nPerformans: ${data.performance.efficiency}%`, [
          { text: 'Tamam', onPress: () => {
            setSelectedEye(null);
            setSessionData(null);
            setEyeItems([]);
            setPickedItems([]);
            setCurrentStep(0);
            loadPickingEyes();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error exiting picking eye:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Toplama Gözü</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedEye ? (
          <View style={styles.form}>
            <Text style={styles.label}>Mevcut Toplama Gözleri</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : pickingEyes.length === 0 ? (
              <Text style={styles.emptyText}>Mevcut toplama gözü bulunmamaktadır</Text>
            ) : (
              pickingEyes.map((eye) => (
                <TouchableOpacity
                  key={eye.id}
                  style={styles.pickingEyeCard}
                  onPress={() => enterPickingEye(eye)}
                >
                  <View style={styles.eyeHeader}>
                    <Text style={styles.eyeCode}>{eye.code}</Text>
                    <Text style={styles.eyeStatus}>{eye.status}</Text>
                  </View>
                  <Text style={styles.eyeName}>{eye.name}</Text>
                  <Text style={styles.eyeLocation}>{eye.zone} - {eye.aisle}</Text>
                  <View style={styles.eyeStats}>
                    <Text style={styles.eyeUtilization}>Doluluk: %{eye.utilization}</Text>
                    <Text style={styles.eyeItems}>{eye.currentItems} ürün</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.activeEyeCard}>
              <Text style={styles.activeEyeTitle}>{selectedEye.name}</Text>
              <Text style={styles.activeEyeCode}>{selectedEye.code}</Text>
              <Text style={styles.activeEyeLocation}>{selectedEye.zone} - {selectedEye.aisle}</Text>
            </View>

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {currentStep >= 3 && eyeItems.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.label}>Toplanabilir Ürünler ({eyeItems.length})</Text>

                {eyeItems.map((item) => (
                  <View key={item.id} style={styles.eyeItemCard}>
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemSku}>{item.sku}</Text>
                    </View>
                    <Text style={styles.itemLocation}>{item.location}</Text>
                    <Text style={styles.itemQuantity}>Mevcut: {item.quantity}</Text>
                    <Text style={styles.itemInstructions}>{item.pickingInstructions}</Text>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.pickButton}
                        onPress={() => pickItem(item, 1)}
                      >
                        <Text style={styles.pickButtonText}>1 Adet Topla</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pickButton}
                        onPress={() => pickItem(item, 5)}
                      >
                        <Text style={styles.pickButtonText}>5 Adet Topla</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.summarySection}>
              <Text style={styles.label}>Toplanan Ürünler ({pickedItems.length})</Text>

              {pickedItems.map((item, index) => (
                <View key={index} style={styles.pickedItemCard}>
                  <Text style={styles.pickedItemName}>{item.name}</Text>
                  <Text style={styles.pickedItemQuantity}>{item.quantity} adet</Text>
                  <Text style={styles.pickedItemTime}>{item.pickedAt.toLocaleTimeString()}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedEye(null);
                setSessionData(null);
                setEyeItems([]);
                setPickedItems([]);
                setCurrentStep(0);
              }}
            >
              <Text style={styles.secondaryButtonText}>← İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const ReceivingScreen = ({ onBack, onScan, user }: any) => {
  const [poNumber, setPoNumber] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleScanProduct = (barcode: string) => {
    // Simulate product lookup from barcode
    const product = {
      sku: barcode,
      name: `Ürün ${barcode}`,
      expected: 1,
      received: 0
    };
    setItems([...items, product]);
  };

  const submitReceiving = async () => {
    if (!poNumber || items.length === 0) {
      Alert.alert('Hata', 'PO numarası ve en az bir ürün gerekli');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/goods-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          poNumber,
          items: items.map(item => ({
            sku: item.sku,
            name: item.name,
            quantity: item.received,
            unitPrice: 10.00
          }))
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Başarılı', 'Mal kabul işlemi tamamlandı', [
          { text: 'Tamam', onPress: onBack }
        ]);
      } else {
        Alert.alert('Hata', data.message || 'İşlem başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Mal Kabul</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sipariş No / PO Number</Text>
            <TextInput
              style={styles.input}
              value={poNumber}
              onChangeText={setPoNumber}
              placeholder="PO-123456"
            />
          </View>

          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Adım {step}/2: Ürün Tarama</Text>
        </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSku}>{item.sku}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text>Beklenen: {item.expected}</Text>
                <TextInput
                  style={styles.quantityInput}
                  value={item.received.toString()}
                  onChangeText={(value) => {
                    const newItems = [...items];
                    newItems[index].received = parseInt(value) || 0;
                    setItems(newItems);
                  }}
                  placeholder="Alınan"
                  keyboardType="numeric"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => onScan()}
          >
            <Text style={styles.secondaryButtonText}>+ Ürün Tara</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={submitReceiving}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>✓ Onayla</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// Enhanced Picking Screen with real-time order management
const PickingScreen = ({ onBack, onScan, user }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/picking-orders', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.filter((order: any) => order.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const startPicking = async (order: any) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/picking-orders/${order.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        setSelectedOrder(order);
        setStep(2);
      }
    } catch (error) {
      console.error('Error starting picking:', error);
    }
  };

  const handleItemScan = (barcode: string) => {
    if (!selectedOrder || !selectedOrder.items) return;

    const currentItem = selectedOrder.items[currentItemIndex];
    if (currentItem.sku === barcode) {
      setCurrentItemIndex(currentItemIndex + 1);
      if (currentItemIndex >= selectedOrder.items.length - 1) {
        setStep(5); // Completed
      }
    } else {
      Alert.alert('Hata', 'Yanlış ürün tarandı');
    }
  };

  const completePicking = async () => {
    if (!selectedOrder) return;

    try {
      const response = await fetch(`http://localhost:3000/api/wms/picking-orders/${selectedOrder.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Toplama işlemi tamamlandı', [
          { text: 'Tamam', onPress: () => {
            setSelectedOrder(null);
            setStep(1);
            loadOrders();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error completing picking:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Toplama İşlemleri</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {step === 1 && (
          <View style={styles.form}>
            <Text style={styles.label}>Bekleyen Siparişler</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : orders.length === 0 ? (
              <Text style={styles.emptyText}>Bekleyen sipariş bulunmamaktadır</Text>
            ) : (
              orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => startPicking(order)}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.pickingNumber}</Text>
                    <Text style={styles.orderPriority}>{order.priority}</Text>
                  </View>
                  <Text style={styles.orderItems}>{order.items?.length || 0} ürün</Text>
                  <Text style={styles.orderWarehouse}>{order.warehouse?.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {step === 2 && selectedOrder && (
          <View style={styles.form}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>Adım {step}/5: Sipariş Başlatıldı</Text>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoTitle}>Sipariş: {selectedOrder.pickingNumber}</Text>
              <Text>Toplanacak Ürün: {selectedOrder.items?.length}</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setStep(3)}
            >
              <Text style={styles.buttonText}>Toplamaya Başla</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && selectedOrder && selectedOrder.items && (
          <View style={styles.form}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>Adım {step}/5: Konuma Git</Text>
            </View>

            <View style={styles.itemCard}>
              <Text style={styles.itemName}>
                {selectedOrder.items[currentItemIndex]?.name}
              </Text>
              <Text style={styles.itemSku}>
                {selectedOrder.items[currentItemIndex]?.sku}
              </Text>
              <Text style={styles.itemLocation}>
                Konum: {selectedOrder.items[currentItemIndex]?.location}
              </Text>
              <Text style={styles.itemQuantity}>
                Miktar: {selectedOrder.items[currentItemIndex]?.quantity}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep(4)}
            >
              <Text style={styles.secondaryButtonText}>Konuma Gittim</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && selectedOrder && selectedOrder.items && (
          <View style={styles.form}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>Adım {step}/5: Ürünü Tara</Text>
            </View>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => onScan()}
            >
              <Text style={styles.scanButtonText}>📷 Ürün Tara</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 5 && selectedOrder && (
          <View style={styles.form}>
            <View style={styles.stepIndicator}>
              <Text style={styles.stepText}>Adım {step}/5: Tamamlandı</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={completePicking}
            >
              <Text style={styles.buttonText}>✓ Toplama Tamamlandı</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Putaway Screen with location optimization
const PutawayScreen = ({ onBack, onScan, user }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [suggestedLocations, setSuggestedLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPendingPutaway();
  }, []);

  const loadPendingPutaway = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/inventory?status=received', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const inventory = await response.json();
        setItems(inventory.filter((item: any) => item.quantityOnHand > 0 && !item.locationId));
      }
    } catch (error) {
      console.error('Error loading putaway items:', error);
    }
    setLoading(false);
  };

  const getSuggestedLocations = async (item: any) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/locations/suggest?itemId=${item.id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const locations = await response.json();
        setSuggestedLocations(locations);
      }
    } catch (error) {
      console.error('Error getting location suggestions:', error);
    }
  };

  const selectItem = (item: any) => {
    setSelectedItem(item);
    getSuggestedLocations(item);
  };

  const assignLocation = async (locationId: string) => {
    if (!selectedItem) return;

    try {
      const response = await fetch(`http://localhost:3000/api/wms/inventory/${selectedItem.id}/putaway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({ locationId }),
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Ürün başarıyla yerleştirildi', [
          { text: 'Tamam', onPress: () => {
            setSelectedItem(null);
            setSuggestedLocations([]);
            loadPendingPutaway();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error assigning location:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
      </TouchableOpacity>
      <Text style={styles.screenTitle}>Yerleştirme</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedItem ? (
          <View style={styles.form}>
            <Text style={styles.label}>Yerleştirilecek Ürünler</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>Yerleştirilecek ürün bulunmamaktadır</Text>
            ) : (
              items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => selectItem(item)}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemSku}>{item.sku}</Text>
                  </View>
                  <Text style={styles.itemQuantity}>Miktar: {item.quantityOnHand}</Text>
                  <Text style={styles.itemCategory}>{item.category}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.selectedItemCard}>
              <Text style={styles.selectedItemName}>{selectedItem.name}</Text>
              <Text style={styles.selectedItemSku}>{selectedItem.sku}</Text>
              <Text style={styles.selectedItemQuantity}>Miktar: {selectedItem.quantityOnHand}</Text>
            </View>

            <Text style={styles.label}>Önerilen Konumlar</Text>
            {suggestedLocations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={styles.locationCard}
                onPress={() => assignLocation(location.id)}
              >
                <View style={styles.locationHeader}>
                  <Text style={styles.locationCode}>{location.locationCode}</Text>
                  <Text style={styles.locationScore}>Skor: {location.score}/100</Text>
                </View>
                <Text style={styles.locationDetails}>
                  {location.zone} - {location.aisle} - {location.rack}
                </Text>
                <Text style={styles.locationReason}>{location.reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSelectedItem(null)}
            >
              <Text style={styles.secondaryButtonText}>← Geri</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Shipping Screen
const ShippingScreen = ({ onBack, onScan, user }: any) => {
  const [shipments, setShipments] = useState<any[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/shipments?status=ready', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setShipments(data);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    }
    setLoading(false);
  };

  const processShipment = async (shipmentId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/shipments/${shipmentId}/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Sevkiyat işlemi başlatıldı');
        loadShipments();
      }
    } catch (error) {
      console.error('Error processing shipment:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Sevkiyat</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Hazır Sevkiyatlar</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : shipments.length === 0 ? (
            <Text style={styles.emptyText}>Hazır sevkiyat bulunmamaktadır</Text>
          ) : (
            shipments.map((shipment) => (
              <TouchableOpacity
                key={shipment.id}
                style={styles.shipmentCard}
                onPress={() => processShipment(shipment.id)}
              >
                <View style={styles.shipmentHeader}>
                  <Text style={styles.shipmentNumber}>{shipment.shipmentNumber}</Text>
                  <Text style={styles.shipmentPriority}>{shipment.priority}</Text>
                </View>
                <Text style={styles.shipmentCustomer}>{shipment.customer}</Text>
                <Text style={styles.shipmentItems}>{shipment.items} ürün</Text>
                <Text style={styles.shipmentDestination}>{shipment.destination}</Text>
                <Text style={styles.shipmentValue}>{shipment.totalValue} ₺</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Enhanced Cycle Count Screen
const CycleCountScreen = ({ onBack, onScan, user }: any) => {
  const [countType, setCountType] = useState('');
  const [counts, setCounts] = useState<any[]>([]);
  const [selectedCount, setSelectedCount] = useState<any>(null);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCycleCounts();
  }, []);

  const loadCycleCounts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/cycle-counts', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCounts(data.filter((count: any) => count.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading cycle counts:', error);
    }
    setLoading(false);
  };

  const startCount = (count: any) => {
    setSelectedCount(count);
    setScannedItems([]);
  };

  const handleItemScan = (barcode: string) => {
    const item = {
      sku: barcode,
      name: `Ürün ${barcode}`,
      scannedAt: new Date(),
      quantity: 1
    };
    setScannedItems([...scannedItems, item]);
  };

  const submitCount = async () => {
    if (!selectedCount || scannedItems.length === 0) return;

    try {
      const response = await fetch(`http://localhost:3000/api/wms/cycle-counts/${selectedCount.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          items: scannedItems.map(item => ({
            sku: item.sku,
            quantity: item.quantity
          }))
        }),
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Sayım tamamlandı', [
          { text: 'Tamam', onPress: () => {
            setSelectedCount(null);
            setScannedItems([]);
            loadCycleCounts();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error submitting count:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Sayım İşlemleri</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedCount ? (
          <View style={styles.form}>
            <Text style={styles.label}>Sayım Tipleri</Text>

            <TouchableOpacity
              style={styles.countTypeCard}
              onPress={() => setCountType('dynamic-pallet')}
            >
              <Text style={styles.countTypeTitle}>Dinamik Sayım - Palet</Text>
              <Text style={styles.countTypeDesc}>Palet bazında sayım</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.countTypeCard}
              onPress={() => setCountType('dynamic-location')}
            >
              <Text style={styles.countTypeTitle}>Dinamik Sayım - Konum</Text>
              <Text style={styles.countTypeDesc}>Konum bazında sayım</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.countTypeCard}
              onPress={() => setCountType('periodic')}
            >
              <Text style={styles.countTypeTitle}>Periyodik Sayım</Text>
              <Text style={styles.countTypeDesc}>Planlı periyodik sayım</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Bekleyen Sayımlar</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : counts.length === 0 ? (
              <Text style={styles.emptyText}>Bekleyen sayım bulunmamaktadır</Text>
            ) : (
              counts.map((count) => (
                <TouchableOpacity
                  key={count.id}
                  style={styles.countCard}
                  onPress={() => startCount(count)}
                >
                  <Text style={styles.countNumber}>{count.countNumber}</Text>
                  <Text style={styles.countLocation}>{count.locationId}</Text>
                  <Text style={styles.countStatus}>{count.status}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.activeCountCard}>
              <Text style={styles.activeCountTitle}>Aktif Sayım: {selectedCount.countNumber}</Text>
              <Text style={styles.activeCountLocation}>Konum: {selectedCount.locationId}</Text>
            </View>

            <Text style={styles.label}>Taranan Ürünler ({scannedItems.length})</Text>

            {scannedItems.map((item, index) => (
              <View key={index} style={styles.scannedItemCard}>
                <Text style={styles.scannedItemName}>{item.name}</Text>
                <Text style={styles.scannedItemSku}>{item.sku}</Text>
                <Text style={styles.scannedItemTime}>{item.scannedAt.toLocaleTimeString()}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => onScan()}
            >
              <Text style={styles.scanButtonText}>📷 Ürün Tara</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={submitCount}
            >
              <Text style={styles.buttonText}>✓ Sayımı Tamamla</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSelectedCount(null)}
            >
              <Text style={styles.secondaryButtonText}>← Geri</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Supervisor Screen
const SupervisorScreen = ({ onBack, onScan, user }: any) => {
  const [operations, setOperations] = useState<any[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);

  const supervisorOps = [
    { id: 'location-change', title: 'Toplama Gözü Değiştirme', icon: '📍', description: 'Ürün konumu değiştirme' },
    { id: 'batch-update', title: 'Palet Lot & Tarih Değiştir', icon: '📦', description: 'Palet bilgileri güncelleme' },
    { id: 'blockage', title: 'Palet Blokaj Koy/Kaldır', icon: '🚫', description: 'Palet blokaj yönetimi' },
    { id: 'sku-management', title: 'SKU Barkod Tanımlama', icon: '🏷️', description: 'SKU ve barkod tanımlama' },
    { id: 'quality-control', title: 'ITS Kalite Kontrol', icon: '✅', description: 'Kalite kontrol işlemleri' },
    { id: 'inventory-adjustment', title: 'Envanter Düzeltme', icon: '⚖️', description: 'Envanter miktarı düzeltme' },
  ];

  const executeOperation = async (operation: any) => {
    setSelectedOperation(operation);
    // Operation'a göre gerekli API call'ları yap
    Alert.alert('İşlem', `${operation.title} işlemi seçildi`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Supervisor İşlemleri</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>⚠️ Yetkili Personel İşlemleri</Text>
          <Text style={styles.warningDesc}>Bu işlemler sadece yetkili personel tarafından yapılmalıdır</Text>
        </View>

        <View style={styles.form}>
          {supervisorOps.map((op) => (
            <TouchableOpacity
              key={op.id}
              style={styles.supervisorOpCard}
              onPress={() => executeOperation(op)}
            >
              <View style={styles.opHeader}>
                <Text style={styles.opIcon}>{op.icon}</Text>
                <View style={styles.opText}>
                  <Text style={styles.opTitle}>{op.title}</Text>
                  <Text style={styles.opDescription}>{op.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// Enhanced Controlled Entry Screen
const ControlledEntryScreen = ({ onBack, onScan, user }: any) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);

  // Handle barcode scanning for controlled entry
  const handleItemScan = async (barcode: string) => {
    if (!sessionData) {
      Alert.alert('Hata', 'Önce bir giriş işlemi başlatın');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/controlled-entry/scan-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          barcode,
          quantity: 1
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScannedItems([...scannedItems, data.item]);
        Alert.alert('Başarılı', data.message);
      } else {
        Alert.alert('Hata', data.message || 'Ürün taranamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/controlled-entry/orders', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data.filter((order: any) => order.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const startEntry = async (order: any, entryType: 'controlled' | 'free') => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/controlled-entry/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          orderNumber: order.orderNumber,
          entryType
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(order);
        setSessionData(data);
        setCurrentStep(0);
      } else {
        Alert.alert('Hata', data.message || 'Giriş başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const handleItemScan = async (barcode: string) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/controlled-entry/scan-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          barcode,
          quantity: 1
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setScannedItems([...scannedItems, data.item]);
        Alert.alert('Başarılı', data.message);
      } else {
        Alert.alert('Hata', data.message || 'Ürün taranamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const completeStep = async (stepId: number) => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/controlled-entry/complete-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          stepId
        }),
      });

      if (response.ok) {
        setCurrentStep(stepId);
        if (stepId >= sessionData.steps.length) {
          finishEntry();
        }
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const finishEntry = async () => {
    if (!sessionData) return;

    try {
      const response = await fetch('http://localhost:3000/api/wms/controlled-entry/finish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          finalData: {
            totalItems: scannedItems.length,
            totalValue: scannedItems.reduce((sum, item) => sum + (item.scannedQuantity * 10), 0)
          }
        }),
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Kontrollü giriş tamamlandı', [
          { text: 'Tamam', onPress: () => {
            setSelectedOrder(null);
            setSessionData(null);
            setScannedItems([]);
            setCurrentStep(0);
            loadOrders();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error finishing entry:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Kontrollü/Serbest Giriş</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedOrder ? (
          <View style={styles.form}>
            <Text style={styles.label}>Giriş Tipi Seçin</Text>

            <TouchableOpacity
              style={styles.entryTypeCard}
              onPress={() => setSelectedOrder({ entryType: 'free' })}
            >
              <Text style={styles.entryTypeIcon}>🚀</Text>
              <View style={styles.entryTypeText}>
                <Text style={styles.entryTypeTitle}>Serbest Giriş</Text>
                <Text style={styles.entryTypeDesc}>Hızlı giriş işlemi</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.entryTypeCard}
              onPress={() => setSelectedOrder({ entryType: 'controlled' })}
            >
              <Text style={styles.entryTypeIcon}>🔍</Text>
              <View style={styles.entryTypeText}>
                <Text style={styles.entryTypeTitle}>Kontrollü Giriş</Text>
                <Text style={styles.entryTypeDesc}>Detaylı kontrol süreci</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Bekleyen Siparişler</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : orders.length === 0 ? (
              <Text style={styles.emptyText}>Bekleyen giriş siparişi bulunmamaktadır</Text>
            ) : (
              orders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.entryOrderCard}
                  onPress={() => startEntry(order, order.entryType)}
                >
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.entryTypeBadge}>{order.entryType}</Text>
                  </View>
                  <Text style={styles.orderSupplier}>{order.supplier}</Text>
                  <Text style={styles.orderItems}>{order.itemCount} ürün • {order.totalValue} ₺</Text>
                  <Text style={styles.orderPriority}>Öncelik: {order.priority}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.activeEntryCard}>
              <Text style={styles.activeEntryTitle}>
                {selectedOrder.entryType === 'controlled' ? 'Kontrollü' : 'Serbest'} Giriş
              </Text>
              <Text style={styles.activeEntryOrder}>{selectedOrder.orderNumber}</Text>
            </View>

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            {currentStep === 2 && (
              <View style={styles.scanSection}>
                <Text style={styles.label}>Ürün Tarama ({scannedItems.length})</Text>

                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => onScan()}
                >
                  <Text style={styles.scanButtonText}>📷 Ürün Tara</Text>
                </TouchableOpacity>

                {scannedItems.map((item, index) => (
                  <View key={index} style={styles.scannedItemCard}>
                    <Text style={styles.scannedItemName}>{item.name}</Text>
                    <Text style={styles.scannedItemSku}>{item.sku}</Text>
                    <Text style={styles.scannedItemQuantity}>Miktar: {item.scannedQuantity}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedOrder(null);
                setSessionData(null);
                setScannedItems([]);
                setCurrentStep(0);
              }}
            >
              <Text style={styles.secondaryButtonText}>← İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Location Assignment Screen (Forklift Operator)
const LocationAssignmentScreen = ({ onBack, onScan, user }: any) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/forklift/location-assignment?status=pending', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
    setLoading(false);
  };

  const startAssignment = async (assignment: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/forklift/location-assignment/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          assignmentId: assignment.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedAssignment(assignment);
        setSessionData(data);
        setCurrentStep(0);
      } else {
        Alert.alert('Hata', 'Görev başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const completeAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      // Simulate completing assignment
      Alert.alert('Tamamlandı', 'Rafa adresleme görevi başarıyla tamamlandı', [
        { text: 'Tamam', onPress: () => {
          setSelectedAssignment(null);
          setSessionData(null);
          setCurrentStep(0);
          loadAssignments();
        }}
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Görev tamamlanamadı');
    }
  };

  const completeStep = (stepId: number) => {
    setCurrentStep(stepId);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Rafa Adresleme</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {!selectedAssignment ? (
          <View style={styles.form}>
            <Text style={styles.label}>Bekleyen Rafa Adresleme Görevleri</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : assignments.length === 0 ? (
              <Text style={styles.emptyText}>Bekleyen görev bulunmamaktadır</Text>
            ) : (
              assignments.map((assignment) => (
                <TouchableOpacity
                  key={assignment.id}
                  style={styles.assignmentCard}
                  onPress={() => startAssignment(assignment)}
                >
                  <View style={styles.assignmentHeader}>
                    <Text style={styles.assignmentType}>{assignment.type}</Text>
                    <Text style={styles.assignmentPriority}>{assignment.priority}</Text>
                  </View>
                  <Text style={styles.assignmentItem}>{assignment.item.name} ({assignment.item.quantity})</Text>
                  <Text style={styles.assignmentLocation}>
                    {assignment.item.currentLocation} → {assignment.item.targetLocation}
                  </Text>
                  <Text style={styles.assignmentWeight}>Ağırlık: {assignment.item.weight} kg</Text>
                  <Text style={styles.assignmentTime}>Süre: {assignment.estimatedTime}dk</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.form}>
            <View style={styles.activeAssignmentCard}>
              <Text style={styles.activeAssignmentTitle}>Aktif Görev: {selectedAssignment.item.name}</Text>
              <Text style={styles.activeAssignmentLocation}>
                {selectedAssignment.item.currentLocation} → {selectedAssignment.item.targetLocation}
              </Text>
              <Text style={styles.activeAssignmentWeight}>Ağırlık: {selectedAssignment.item.weight} kg</Text>
            </View>

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.assignmentActions}>
              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={() => Alert.alert('Acil Durum', 'Acil durum butonu aktif')}
              >
                <Text style={styles.emergencyButtonText}>🚨 ACİL DURUM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.completeAssignmentButton}
                onPress={completeAssignment}
              >
                <Text style={styles.completeAssignmentButtonText}>✅ Görevi Tamamla</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedAssignment(null);
                setSessionData(null);
                setCurrentStep(0);
              }}
            >
              <Text style={styles.secondaryButtonText}>← Görevi İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Incoming Orders Screen (Forklift Operator)
const IncomingOrdersScreen = ({ onBack, onScan, user }: any) => {
  const [incomingOrders, setIncomingOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIncomingOrders();
  }, []);

  const loadIncomingOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/forklift/incoming-orders?status=receiving,scheduled', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIncomingOrders(data);
      }
    } catch (error) {
      console.error('Error loading incoming orders:', error);
    }
    setLoading(false);
  };

  const assignOrder = async (order: any) => {
    try {
      const response = await fetch('http://localhost:3000/api/wms/forklift/incoming-orders/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          orderId: order.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedOrder(order);
        Alert.alert('Başarılı', data.message);
      } else {
        Alert.alert('Hata', 'Sipariş atanamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
  };

  const getTimeToEta = (eta: string) => {
    const etaDate = new Date(eta);
    const now = new Date();
    const diff = etaDate.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 0) return 'Geçmiş';
    if (minutes < 60) return `${minutes}dk`;
    const hours = Math.floor(minutes / 60);
    return `${hours}sa`;
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Gelen Siparişler</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Dock'ta Bekleyen Siparişler</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : incomingOrders.length === 0 ? (
            <Text style={styles.emptyText}>Bekleyen gelen sipariş bulunmamaktadır</Text>
          ) : (
            incomingOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.incomingOrderCard}
                onPress={() => assignOrder(order)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.orderPriority}>{order.priority}</Text>
                </View>
                <Text style={styles.orderCustomer}>{order.customer}</Text>
                <Text style={styles.orderPallets}>{order.estimatedPallets} palet • {order.totalWeight} kg</Text>
                <View style={styles.orderDetails}>
                  <Text style={styles.orderDock}>Dock: {order.dock}</Text>
                  <Text style={styles.orderEta}>ETA: {getTimeToEta(order.eta)}</Text>
                </View>
                <Text style={styles.orderSpecial}>{order.specialInstructions}</Text>
              </TouchableOpacity>
            ))
          )}

          {selectedOrder && (
            <View style={styles.assignedOrderCard}>
              <Text style={styles.assignedOrderTitle}>Atanan Sipariş: {selectedOrder.orderNumber}</Text>
              <Text style={styles.assignedOrderCustomer}>{selectedOrder.customer}</Text>
              <Text style={styles.assignedOrderDock}>Dock: {selectedOrder.dock}</Text>
              <Text style={styles.assignedOrderItems}>
                {selectedOrder.items.length} ürün • {selectedOrder.estimatedPallets} palet
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// Enhanced Narrow Aisle Forklift Screen
const NarrowAisleScreen = ({ onBack, onScan, user }: any) => {
  const [aisleData, setAisleData] = useState<any>(null);
  const [selectedAisle, setSelectedAisle] = useState<any>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAisleData();
  }, []);

  const loadAisleData = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/wms/forklift/narrow-aisle/availability', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAisleData(data);
      }
    } catch (error) {
      console.error('Error loading aisle data:', error);
    }
    setLoading(false);
  };

  const selectAisle = (aisle: any) => {
    setSelectedAisle(aisle);
    setCurrentStep(1);
  };

  const selectEquipment = (equipment: any) => {
    setSelectedEquipment(equipment);
    setCurrentStep(2);
  };

  const startOperation = async () => {
    if (!selectedAisle || !selectedEquipment) return;

    try {
      // Simulate starting narrow aisle operation
      Alert.alert('Başarılı', `Dar koridor ${selectedAisle.aisle} - ${selectedEquipment.type} ile operasyon başlatıldı`, [
        { text: 'Tamam', onPress: () => {
          setCurrentStep(3);
        }}
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Operasyon başlatılamadı');
    }
  };

  const completeOperation = async () => {
    try {
      // Simulate completing narrow aisle operation
      Alert.alert('Tamamlandı', 'Dar koridor operasyonu başarıyla tamamlandı', [
        { text: 'Tamam', onPress: () => {
          setSelectedAisle(null);
          setSelectedEquipment(null);
          setCurrentStep(0);
          loadAisleData();
        }}
      ]);
    } catch (error) {
      Alert.alert('Hata', 'Operasyon tamamlanamadı');
    }
  };

  const getAisleStatusColor = (status: string) => {
    if (status === 'available') return '#4CAF50';
    if (status === 'occupied') return '#FF9800';
    if (status === 'maintenance') return '#F44336';
    return '#9E9E9E';
  };

  const getEquipmentStatusColor = (status: string) => {
    if (status === 'available') return '#4CAF50';
    if (status === 'charging') return '#2196F3';
    if (status === 'maintenance') return '#F44336';
    return '#9E9E9E';
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Dar Koridor</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <>
            {!selectedAisle && !selectedEquipment && (
              <View style={styles.form}>
                <Text style={styles.sectionTitle}>Dar Koridorlar</Text>

                {aisleData && aisleData.narrowAisles.map((aisle: any) => (
                  <TouchableOpacity
                    key={aisle.id}
                    style={[styles.aisleCard, { borderLeftColor: getAisleStatusColor(aisle.status) }]}
                    onPress={() => selectAisle(aisle)}
                    disabled={aisle.status !== 'available'}
                  >
                    <View style={styles.aisleHeader}>
                      <Text style={styles.aisleName}>{aisle.zone} - {aisle.aisle}</Text>
                      <Text style={[styles.aisleStatus, { backgroundColor: getAisleStatusColor(aisle.status) }]}>
                        {aisle.status === 'available' ? 'Müsait' :
                         aisle.status === 'occupied' ? 'Meşgul' : 'Bakım'}
                      </Text>
                    </View>
                    <Text style={styles.aisleOperator}>
                      {aisle.currentOperator ? `Kullanan: ${aisle.currentOperator}` : 'Boş'}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.sectionTitle}>Ekipman</Text>

                {aisleData && aisleData.equipment.map((equipment: any) => (
                  <TouchableOpacity
                    key={equipment.id}
                    style={[styles.equipmentCard, { borderLeftColor: getEquipmentStatusColor(equipment.status) }]}
                    onPress={() => selectEquipment(equipment)}
                    disabled={equipment.status !== 'available'}
                  >
                    <View style={styles.equipmentHeader}>
                      <Text style={styles.equipmentType}>{equipment.type}</Text>
                      <Text style={[styles.equipmentStatus, { backgroundColor: getEquipmentStatusColor(equipment.status) }]}>
                        {equipment.status === 'available' ? 'Müsait' :
                         equipment.status === 'charging' ? 'Şarj Ediliyor' : 'Bakım'}
                      </Text>
                    </View>
                    <Text style={styles.equipmentBattery}>
                      Batarya: %{equipment.battery}
                    </Text>
                  </TouchableOpacity>
                ))}

                <View style={styles.recommendationsCard}>
                  <Text style={styles.recommendationsTitle}>Öneriler</Text>
                  {aisleData && aisleData.recommendations.map((rec: string, index: number) => (
                    <Text key={index} style={styles.recommendationText}>• {rec}</Text>
                  ))}
                </View>
              </View>
            )}

            {selectedAisle && !selectedEquipment && (
              <View style={styles.form}>
                <View style={styles.selectedAisleCard}>
                  <Text style={styles.selectedAisleTitle}>Seçili Koridor: {selectedAisle.zone} - {selectedAisle.aisle}</Text>
                  <Text style={styles.selectedAisleStatus}>Durum: Müsait</Text>
                </View>

                <Text style={styles.sectionTitle}>Ekipman Seçin</Text>

                {aisleData && aisleData.equipment.filter((eq: any) => eq.status === 'available').map((equipment: any) => (
                  <TouchableOpacity
                    key={equipment.id}
                    style={styles.equipmentCard}
                    onPress={() => selectEquipment(equipment)}
                  >
                    <View style={styles.equipmentHeader}>
                      <Text style={styles.equipmentType}>{equipment.type}</Text>
                      <Text style={styles.equipmentBattery}>Batarya: %{equipment.battery}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setSelectedAisle(null)}
                >
                  <Text style={styles.secondaryButtonText}>← Koridor Seçimini İptal</Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedAisle && selectedEquipment && currentStep < 3 && (
              <View style={styles.form}>
                <View style={styles.operationCard}>
                  <Text style={styles.operationTitle}>Dar Koridor Operasyonu</Text>
                  <Text style={styles.operationDetails}>
                    Koridor: {selectedAisle.zone} - {selectedAisle.aisle}
                  </Text>
                  <Text style={styles.operationDetails}>
                    Ekipman: {selectedEquipment.type} (Batarya: %{selectedEquipment.battery})
                  </Text>
                </View>

                <View style={styles.stepsContainer}>
                  <Text style={styles.stepsTitle}>Operasyon Adımları</Text>

                  <TouchableOpacity
                    style={[styles.stepItem, currentStep === 0 && styles.stepItemActive]}
                    onPress={() => setCurrentStep(0)}
                  >
                    <Text style={styles.stepNumber}>1</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Güvenlik Kontrolü</Text>
                      <Text style={styles.stepDescription}>Ekipman ve koridor güvenliğini kontrol edin</Text>
                    </View>
                    {currentStep > 0 && <Text style={styles.stepCheckmark}>✓</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.stepItem, currentStep === 1 && styles.stepItemActive]}
                    onPress={() => setCurrentStep(1)}
                  >
                    <Text style={styles.stepNumber}>2</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Koridor Girişi</Text>
                      <Text style={styles.stepDescription}>Dar koridora güvenli giriş yapın</Text>
                    </View>
                    {currentStep > 1 && <Text style={styles.stepCheckmark}>✓</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.stepItem, currentStep === 2 && styles.stepItemActive]}
                    onPress={() => setCurrentStep(2)}
                  >
                    <Text style={styles.stepNumber}>3</Text>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>Operasyon Hazırlığı</Text>
                      <Text style={styles.stepDescription}>Görev için gerekli hazırlıkları tamamlayın</Text>
                    </View>
                    {currentStep > 2 && <Text style={styles.stepCheckmark}>✓</Text>}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.startOperationButton}
                  onPress={startOperation}
                >
                  <Text style={styles.startOperationButtonText}>🚀 Operasyonu Başlat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setSelectedAisle(null);
                    setSelectedEquipment(null);
                    setCurrentStep(0);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>← Seçimi İptal</Text>
                </TouchableOpacity>
              </View>
            )}

            {currentStep >= 3 && (
              <View style={styles.form}>
                <View style={styles.activeOperationCard}>
                  <Text style={styles.activeOperationTitle}>Aktif Dar Koridor Operasyonu</Text>
                  <Text style={styles.activeOperationDetails}>
                    Koridor: {selectedAisle?.zone} - {selectedAisle?.aisle}
                  </Text>
                  <Text style={styles.activeOperationDetails}>
                    Ekipman: {selectedEquipment?.type}
                  </Text>
                </View>

                <View style={styles.operationControls}>
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={() => Alert.alert('Acil Durum', 'Acil durum butonu aktif')}
                  >
                    <Text style={styles.emergencyButtonText}>🚨 ACİL DURUM</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.completeOperationButton}
                    onPress={completeOperation}
                  >
                    <Text style={styles.completeOperationButtonText}>✅ Operasyonu Tamamla</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.safetyChecklist}>
                  <Text style={styles.checklistTitle}>Güvenlik Kontrol Listesi</Text>

                  <View style={styles.checklistItem}>
                    <Text style={styles.checklistIcon}>✅</Text>
                    <Text style={styles.checklistText}>Ekipman güvenlik kontrolü tamamlandı</Text>
                  </View>

                  <View style={styles.checklistItem}>
                    <Text style={styles.checklistIcon}>✅</Text>
                    <Text style={styles.checklistText}>Koridor temizliği doğrulandı</Text>
                  </View>

                  <View style={styles.checklistItem}>
                    <Text style={styles.checklistIcon}>✅</Text>
                    <Text style={styles.checklistText}>Acil çıkış yolları açık</Text>
                  </View>

                  <View style={styles.checklistItem}>
                    <Text style={styles.checklistIcon}>⚠️</Text>
                    <Text style={styles.checklistText}>Personel uyarıları yapıldı</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => {
                    setSelectedAisle(null);
                    setSelectedEquipment(null);
                    setCurrentStep(0);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>← Operasyonu İptal</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Forklift RT/TT Screen
const ForkliftRTScreen = ({ onBack, onScan, user }: any) => {
  const [rtTasks, setRtTasks] = useState<any[]>([]);
  const [ttTasks, setTtTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [taskDetails, setTaskDetails] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('rt'); // rt, tt, details

  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'rt' ? 'rt-tasks' : 'tt-tasks';
      const response = await fetch(`http://localhost:3000/api/wms/forklift/${endpoint}?status=pending`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (activeTab === 'rt') {
          setRtTasks(data);
        } else {
          setTtTasks(data);
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    setLoading(false);
  };

  const startTask = async (task: any) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/wms/forklift/tasks/${task.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTask(task);
        setSessionData(data);
        setCurrentStep(0);
        if (activeTab === 'rt') {
          loadTaskDetails(task.id);
        }
      } else {
        Alert.alert('Hata', 'Görev başlatılamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı');
    }
    setLoading(false);
  };

  const loadTaskDetails = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/forklift/tasks/${taskId}/details`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTaskDetails(data);
      }
    } catch (error) {
      console.error('Error loading task details:', error);
    }
  };

  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`http://localhost:3000/api/wms/forklift/tasks/${selectedTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Görev Tamamlandı!', `${data.message}\nVerimlilik: ${data.performance.efficiency}%`, [
          { text: 'Tamam', onPress: () => {
            setSelectedTask(null);
            setSessionData(null);
            setTaskDetails(null);
            setCurrentStep(0);
            loadTasks();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const completeStep = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const checkNarrowAisle = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/wms/forklift/narrow-aisle/availability', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Dar Koridor Durumu', data.recommendations.join('\n'));
      }
    } catch (error) {
      console.error('Error checking narrow aisle:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Forklift RT/TT</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rt' && styles.tabButtonActive]}
          onPress={() => setActiveTab('rt')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'rt' && styles.tabButtonTextActive]}>
            RT Görevleri ({rtTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'tt' && styles.tabButtonActive]}
          onPress={() => setActiveTab('tt')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'tt' && styles.tabButtonTextActive]}>
            TT Görevleri ({ttTasks.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'details' && styles.tabButtonActive]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'details' && styles.tabButtonTextActive]}>
            Görev Detayları
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        {activeTab === 'rt' && (
          <View style={styles.form}>
            <Text style={styles.label}>RT (Retrieval) Görevleri</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : rtTasks.length === 0 ? (
              <Text style={styles.emptyText}>RT görevi bulunmamaktadır</Text>
            ) : (
              rtTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => startTask(task)}
                >
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskNumber}>{task.taskNumber}</Text>
                    <Text style={styles.taskPriority}>{task.priority}</Text>
                  </View>
                  <Text style={styles.taskItem}>{task.item.name} ({task.item.quantity})</Text>
                  <Text style={styles.taskLocation}>{task.item.location} → {task.item.destination}</Text>
                  <Text style={styles.taskTime}>Süre: {task.estimatedTime}dk • Kalan: {task.timeToDeadline}dk</Text>
                  <Text style={styles.taskInstructions}>{task.instructions}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'tt' && (
          <View style={styles.form}>
            <Text style={styles.label}>TT (Transfer) Görevleri</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : ttTasks.length === 0 ? (
              <Text style={styles.emptyText}>TT görevi bulunmamaktadır</Text>
            ) : (
              ttTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => startTask(task)}
                >
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskNumber}>{task.taskNumber}</Text>
                    <Text style={styles.taskPriority}>{task.priority}</Text>
                  </View>
                  <Text style={styles.taskItem}>{task.item.name} ({task.item.quantity})</Text>
                  <Text style={styles.taskLocation}>
                    {task.item.fromLocation} → {task.item.toLocation}
                    {task.narrowAisle && <Text style={styles.narrowAisleBadge}>Dar Koridor</Text>}
                  </Text>
                  <Text style={styles.taskTime}>Süre: {task.estimatedTime}dk • Kalan: {task.timeToDeadline}dk</Text>
                  <Text style={styles.taskEquipment}>Gerekli Ekipman: {task.requiresEquipment}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'details' && selectedTask && (
          <View style={styles.form}>
            <View style={styles.activeTaskCard}>
              <Text style={styles.activeTaskTitle}>Aktif Görev: {selectedTask.taskNumber}</Text>
              <Text style={styles.activeTaskType}>{selectedTask.type.toUpperCase()}</Text>
              <Text style={styles.activeTaskItem}>{selectedTask.item.name}</Text>
            </View>

            {taskDetails && (
              <View style={styles.taskDetailsCard}>
                <Text style={styles.detailsTitle}>Görev Detayları</Text>
                <Text style={styles.detailsText}>Mevcut Konum: {taskDetails.currentLocation}</Text>
                <Text style={styles.detailsText}>Hedef Konum: {taskDetails.targetLocation}</Text>
                <Text style={styles.detailsText}>İlerleme: %{taskDetails.progress}</Text>
                <Text style={styles.detailsText}>Geçen Süre: {taskDetails.timeElapsed}dk</Text>
                <Text style={styles.detailsText}>Sonraki Adım: {taskDetails.nextAction}</Text>
              </View>
            )}

            {sessionData && sessionData.steps.map((step: any, index: number) => (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepCard,
                  index === currentStep && styles.stepCardActive,
                  step.completed && styles.stepCardCompleted
                ]}
                onPress={() => completeStep(step.id)}
                disabled={index > currentStep || step.completed}
              >
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>{step.id}</Text>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.name}</Text>
                    <Text style={styles.stepStatus}>
                      {step.completed ? '✓ Tamamlandı' : index === currentStep ? '🔄 Aktif' : '⏳ Bekliyor'}
                    </Text>
                  </View>
                  {step.completed && <Text style={styles.stepCheckmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.taskActions}>
              <TouchableOpacity
                style={styles.checkNarrowButton}
                onPress={checkNarrowAisle}
              >
                <Text style={styles.checkNarrowButtonText}>🚧 Dar Koridor Kontrolü</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.completeTaskButton}
                onPress={completeTask}
              >
                <Text style={styles.completeTaskButtonText}>✅ Görevi Tamamla</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setSelectedTask(null);
                setSessionData(null);
                setTaskDetails(null);
                setCurrentStep(0);
              }}
            >
              <Text style={styles.secondaryButtonText}>← Görevi İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Enhanced Forklift Screen with RT/TT operations
const ForkliftScreen = ({ onBack, onScan, user }: any) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState('rt'); // rt, tt, putaway, retrieval

  useEffect(() => {
    loadTasks();
  }, [taskType]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const endpoint = taskType === 'rt' ? 'rt-tasks' : taskType === 'tt' ? 'tt-tasks' : 'forklift-tasks';
      const response = await fetch(`http://localhost:3000/api/wms/forklift/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.filter((task: any) => task.status === 'pending'));
      }
    } catch (error) {
      console.error('Error loading forklift tasks:', error);
    }
    setLoading(false);
  };

  const startTask = async (task: any) => {
    try {
      const response = await fetch(`http://localhost:3000/api/wms/forklift/tasks/${task.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        setSelectedTask(task);
        Alert.alert('Başarılı', `${taskType.toUpperCase()} görevi başlatıldı`);
      }
    } catch (error) {
      console.error('Error starting task:', error);
    }
  };

  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`http://localhost:3000/api/wms/forklift/tasks/${selectedTask.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Başarılı', 'Görev tamamlandı', [
          { text: 'Tamam', onPress: () => {
            setSelectedTask(null);
            loadTasks();
          }}
        ]);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Forklift İşlemleri</Text>
        <TouchableOpacity style={styles.scanButtonSmall} onPress={() => onScan()}>
          <Text style={styles.scanButtonText}>📷</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Görev Tipi</Text>

          <View style={styles.taskTypeContainer}>
            <TouchableOpacity
              style={[styles.taskTypeButton, taskType === 'rt' && styles.taskTypeActive]}
              onPress={() => setTaskType('rt')}
            >
              <Text style={[styles.taskTypeText, taskType === 'rt' && styles.taskTypeTextActive]}>RT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.taskTypeButton, taskType === 'tt' && styles.taskTypeActive]}
              onPress={() => setTaskType('tt')}
            >
              <Text style={[styles.taskTypeText, taskType === 'tt' && styles.taskTypeTextActive]}>TT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.taskTypeButton, taskType === 'putaway' && styles.taskTypeActive]}
              onPress={() => setTaskType('putaway')}
            >
              <Text style={[styles.taskTypeText, taskType === 'putaway' && styles.taskTypeTextActive]}>Yerleştirme</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.taskTypeButton, taskType === 'retrieval' && styles.taskTypeActive]}
              onPress={() => setTaskType('retrieval')}
            >
              <Text style={[styles.taskTypeText, taskType === 'retrieval' && styles.taskTypeTextActive]}>Çekme</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Bekleyen Görevler</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" />
          ) : tasks.length === 0 ? (
            <Text style={styles.emptyText}>Bekleyen görev bulunmamaktadır</Text>
          ) : (
            tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskCard}
                onPress={() => startTask(task)}
              >
                <View style={styles.taskHeader}>
                  <Text style={styles.taskNumber}>{task.taskNumber}</Text>
                  <Text style={styles.taskPriority}>{task.priority}</Text>
                </View>
                <Text style={styles.taskType}>Tip: {taskType.toUpperCase()}</Text>
                <Text style={styles.taskLocation}>Konum: {task.fromLocation} → {task.toLocation}</Text>
                <Text style={styles.taskItem}>{task.itemName} ({task.quantity})</Text>
                <Text style={styles.taskEta}>ETA: {task.estimatedTime}</Text>
              </TouchableOpacity>
            ))
          )}

          {selectedTask && (
            <View style={styles.activeTaskCard}>
              <Text style={styles.activeTaskTitle}>Aktif Görev: {selectedTask.taskNumber}</Text>
              <Text style={styles.activeTaskDetails}>
                {selectedTask.fromLocation} → {selectedTask.toLocation}
              </Text>
              <Text style={styles.activeTaskItem}>{selectedTask.itemName}</Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={completeTask}
              >
                <Text style={styles.buttonText}>✓ Görevi Tamamla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setSelectedTask(null)}
              >
                <Text style={styles.secondaryButtonText}>← Geri</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main Container & Layout
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },

  // Login Screen
  loginContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loginHeader: {
    backgroundColor: '#007AFF',
    padding: 40,
    paddingTop: 80,
    alignItems: 'center'
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8
  },
  loginSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)'
  },
  loginForm: {
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
    margin: 20,
    marginTop: -20,
    borderRadius: 16,
  },

  // Header
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white'
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)'
  },
  logoutButton: {
    padding: 8
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },

  // Main Menu
  menu: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8
  },
  menuHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  menuItem: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  menuIcon: {
    fontSize: 28,
    marginRight: 16
  },
  menuText: {
    flex: 1
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666'
  },
  chevron: {
    fontSize: 24,
    color: '#ccc'
  },

  // Screen Layout
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center'
  },
  screenContent: {
    flex: 1,
    padding: 16
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600'
  },
  scanButtonSmall: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8
  },

  // Form Elements
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 80,
    textAlign: 'center'
  },

  // Buttons
  primaryButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20
  },
  secondaryButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },

  // Steps & Progress
  stepIndicator: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center'
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2'
  },

  // Item Cards
  itemCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  itemSku: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  // Barcode Scanner
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000'
  },
  scanner: {
    flex: 1
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12
  },
  scannerInstructions: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center'
  },
  scannerText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20
  },
  rescanButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12
  },
  rescanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },

  // Hints & Messages
  hintText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4
  },

  // Order Cards
  orderCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  orderPriority: {
    fontSize: 12,
    backgroundColor: '#FF9500',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  orderItems: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  orderWarehouse: {
    fontSize: 12,
    color: '#999'
  },

  // Order Info
  orderInfo: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  orderInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8
  },

  // Item Cards
  itemLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4
  },
  itemCategory: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },

  // Selected Item Card
  selectedItemCard: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  selectedItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  selectedItemSku: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  selectedItemQuantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4
  },

  // Location Cards
  locationCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  locationCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  locationScore: {
    fontSize: 12,
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  locationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  locationReason: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic'
  },

  // Shipment Cards
  shipmentCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0'
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  shipmentNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  shipmentCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  shipmentItems: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2
  },
  shipmentDestination: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2
  },
  shipmentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  },

  // Count Cards
  countTypeCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center'
  },
  countTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4
  },
  countTypeDesc: {
    fontSize: 12,
    color: '#666'
  },

  countCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  countNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  countLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  countStatus: {
    fontSize: 12,
    color: '#999'
  },

  // Active Count
  activeCountCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800'
  },
  activeCountTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8
  },
  activeCountLocation: {
    fontSize: 14,
    color: '#666'
  },

  // Scanned Items
  scannedItemCard: {
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9C27B0'
  },
  scannedItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  scannedItemSku: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  scannedItemTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },

  // Warning Box
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082'
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    textAlign: 'center',
    marginBottom: 4
  },
  warningDesc: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center'
  },

  // Supervisor Operations
  supervisorOpCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722'
  },
  opHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  opIcon: {
    fontSize: 24,
    marginRight: 12
  },
  opText: {
    flex: 1
  },
  opTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  opDescription: {
    fontSize: 12,
    color: '#666'
  },

  // Forklift Tasks
  taskTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8
  },
  taskTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center'
  },
  taskTypeActive: {
    backgroundColor: '#007AFF'
  },
  taskTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  taskTypeTextActive: {
    color: 'white'
  },

  taskCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#607D8B'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  taskPriority: {
    fontSize: 12,
    backgroundColor: '#FF5722',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  taskLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  taskItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  taskEta: {
    fontSize: 12,
    color: '#999'
  },

  activeTaskCard: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  activeTaskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8
  },
  activeTaskDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  activeTaskItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16
  },

  // Empty States
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
    padding: 32
  },

  // Controlled Entry Styles
  entryTypeCard: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  entryTypeIcon: {
    fontSize: 32,
    marginRight: 16
  },
  entryTypeText: {
    flex: 1
  },
  entryTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4
  },
  entryTypeDesc: {
    fontSize: 14,
    color: '#666'
  },

  entryOrderCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  entryTypeBadge: {
    fontSize: 12,
    backgroundColor: '#FF9800',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },

  activeEntryCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800'
  },
  activeEntryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8
  },
  activeEntryOrder: {
    fontSize: 14,
    color: '#666'
  },

  stepCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ccc'
  },
  stepCardActive: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#007AFF'
  },
  stepCardCompleted: {
    backgroundColor: '#E8F5E8',
    borderLeftColor: '#4CAF50'
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    color: 'white',
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12
  },
  stepContent: {
    flex: 1
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  stepStatus: {
    fontSize: 12,
    color: '#666'
  },
  stepCheckmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold'
  },

  scanSection: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#9C27B0'
  },

  orderSupplier: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  orderPriority: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },

  // Picking Eye Styles
  pickingEyeCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  eyeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  eyeCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  eyeStatus: {
    fontSize: 12,
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  eyeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  eyeLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  eyeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  eyeUtilization: {
    fontSize: 12,
    color: '#666'
  },
  eyeItems: {
    fontSize: 12,
    color: '#999'
  },

  activeEyeCard: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  activeEyeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4
  },
  activeEyeCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  activeEyeLocation: {
    fontSize: 12,
    color: '#999'
  },

  itemsSection: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9800'
  },

  eyeItemCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8
  },
  pickButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  pickButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },

  itemInstructions: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4
  },

  summarySection: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },

  pickedItemCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderLeftWidth: 3
  },
  pickedItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  pickedItemQuantity: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2
  },
  pickedItemTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },

  // İTS Packaging Styles
  packagingOrderCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0'
  },
  packagingPriority: {
    fontSize: 12,
    backgroundColor: '#FF5722',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },

  activeOrderCard: {
    backgroundColor: '#E1F5FE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#01579B'
  },
  activeOrderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#01579B',
    marginBottom: 4
  },
  activeOrderCustomer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  activeOrderDetails: {
    fontSize: 12,
    color: '#999'
  },

  analysisSection: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFC107'
  },

  orderSummary: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },

  optimizationSection: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#9C27B0'
  },
  optimizationInput: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  optimizationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A148C',
    marginBottom: 8,
    textAlign: 'center'
  },
  optimizationDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16
  },
  optimizeButton: {
    backgroundColor: '#9C27B0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  optimizeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },

  optimizationResult: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8
  },
  optimizationEfficiency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 16
  },

  boxConfigCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  boxType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  boxDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  boxItems: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  createBoxButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  createBoxButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },

  optimizationSummary: {
    backgroundColor: '#E8F5E8',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8
  },

  boxesSection: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9800'
  },

  createdBoxCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  boxTLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  boxDimensions: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  boxQuantity: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8
  },
  scanBoxButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  scanBoxButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },

  qualitySection: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },
  qualityChecks: {
    marginBottom: 16
  },
  qualityCheck: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 8
  },
  qualityButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  qualityButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },

  palletSection: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  palletInfo: {
    marginBottom: 16,
    alignItems: 'center'
  },
  palletText: {
    fontSize: 14,
    color: '#1565C0',
    marginBottom: 4,
    textAlign: 'center'
  },
  palletButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  palletButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },

  orderStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  orderBoxes: {
    fontSize: 12,
    color: '#666'
  },
  orderTime: {
    fontSize: 12,
    color: '#FF5722',
    fontWeight: '600'
  },

  orderSpecial: {
    fontSize: 12,
    color: '#FF5722',
    fontStyle: 'italic',
    marginTop: 4,
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4
  },

  orderDestination: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },

  // Auto Count Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  tabButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center'
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF'
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  tabButtonTextActive: {
    color: '#007AFF'
  },

  autoCountCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00BCD4'
  },
  countHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  countTrigger: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  countPriority: {
    fontSize: 12,
    backgroundColor: '#FF5722',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  countLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  countItem: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  countDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  countTime: {
    fontSize: 12,
    color: '#999'
  },

  triggersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  addTriggerButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 6
  },
  addTriggerButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },

  triggerCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800'
  },
  triggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  triggerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  triggerStatus: {
    fontSize: 12,
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  triggerDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  triggerValue: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontWeight: '600'
  },
  triggerLocations: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4
  },
  triggerStats: {
    fontSize: 10,
    color: '#999'
  },

  statisticsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  statisticsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center'
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },

  topZones: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 6
  },

  recommendation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16
  },

  activeCountCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800'
  },
  activeCountTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4
  },
  activeCountLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2
  },
  activeCountItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },

  countingSection: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4CAF50'
  },

  countedItemCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  countedItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  countedItemSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8
  },
  countResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  systemQuantity: {
    fontSize: 12,
    color: '#666'
  },
  countedQuantity: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600'
  },
  variance: {
    fontSize: 12,
    fontWeight: '600'
  },
  varianceZero: {
    color: '#4CAF50'
  },
  variancePositive: {
    color: '#FF5722'
  },
  varianceNegative: {
    color: '#2196F3'
  },

  qualityStatus: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    padding: 4,
    borderRadius: 4
  },
  qualityPerfect: {
    color: '#2E7D32',
    backgroundColor: '#E8F5E8'
  },
  qualityGood: {
    color: '#4CAF50',
    backgroundColor: '#E8F5E8'
  },
  qualityAcceptable: {
    color: '#FF9800',
    backgroundColor: '#FFF3E0'
  },
  qualityInvestigation: {
    color: '#F44336',
    backgroundColor: '#FFEBEE'
  },

  recountWarning: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
    marginTop: 8
  },
  recountWarningText: {
    fontSize: 12,
    color: '#E65100',
    textAlign: 'center',
    fontWeight: '600'
  },

  // Forklift RT/TT Styles
  taskCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#607D8B'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  taskPriority: {
    fontSize: 12,
    backgroundColor: '#FF5722',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  taskItem: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  taskLocation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2
  },
  taskTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2
  },
  taskInstructions: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4
  },
  taskEquipment: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  narrowAisleBadge: {
    fontSize: 10,
    backgroundColor: '#FF9800',
    color: 'white',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    marginLeft: 4
  },

  activeTaskCard: {
    backgroundColor: '#E8F5E8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  activeTaskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4
  },
  activeTaskType: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 4
  },
  activeTaskItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },

  taskDetailsCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF9800'
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 12
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },

  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8
  },
  checkNarrowButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1
  },
  checkNarrowButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  completeTaskButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1
  },
  completeTaskButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },

  // Dashboard Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 8
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  summaryItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },

  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  performanceItem: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  performanceLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center'
  },

  alertItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4
  },
  alertIcon: {
    fontSize: 16,
    marginRight: 12
  },
  alertContent: {
    flex: 1
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2
  },
  alertTime: {
    fontSize: 12,
    color: '#999'
  },

  operationCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  operationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  operationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  operationStatus: {
    fontSize: 12,
    backgroundColor: '#4CAF50',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase'
  },
  operationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  operationStat: {
    fontSize: 12,
    color: '#666'
  },
  operationEfficiency: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50'
  },

  resourceCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  resourceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },

  bottlenecksCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF9800'
  },
  bottlenecksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8
  },
  bottleneckText: {
    fontSize: 14,
    color: '#E65100',
    marginBottom: 4
  },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4
  },
  metricTarget: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center'
  },

  comparisonCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#607D8B'
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  comparisonValue: {
    fontSize: 14,
    marginBottom: 4
  },
  positive: {
    color: '#4CAF50'
  },
  negative: {
    color: '#F44336'
  },

  alertCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  alertLocation: {
    fontSize: 12,
    color: '#666'
  },
  alertTime: {
    fontSize: 12,
    color: '#999'
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  acknowledgeButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center'
  },
  acknowledgeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  }
});

export default App;

