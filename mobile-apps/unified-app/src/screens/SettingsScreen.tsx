import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput
} from 'react-native';

const SettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState({
    language: 'tr',
    theme: 'light',
    notifications: true,
    location: true,
    analytics: false,
    autoSync: true,
    offlineMode: false
  });

  const [apiKey, setApiKey] = useState('');

  const handleToggle = (key: string, value: boolean) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };

  const handleLanguageChange = () => {
    Alert.alert(
      'Dil Seçimi',
      'Hangi dili kullanmak istiyorsunuz?',
      [
        { text: 'Türkçe', onPress: () => setSettings({...settings, language: 'tr'}) },
        { text: 'English', onPress: () => setSettings({...settings, language: 'en'}) },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const handleThemeChange = () => {
    Alert.alert(
      'Tema Seçimi',
      'Hangi temayı kullanmak istiyorsunuz?',
      [
        { text: 'Açık Tema', onPress: () => setSettings({...settings, theme: 'light'}) },
        { text: 'Koyu Tema', onPress: () => setSettings({...settings, theme: 'dark'}) },
        { text: 'Otomatik', onPress: () => setSettings({...settings, theme: 'auto'}) },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Önbellek Temizle',
      'Tüm önbellek verilerini temizlemek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Temizle', style: 'destructive', onPress: () => console.log('Cache cleared') }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Veri Dışa Aktarma', 'Verileriniz dışa aktarılıyor...');
  };

  const handleImportData = () => {
    Alert.alert('Veri İçe Aktarma', 'Veri dosyası seçin...');
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Ayarları Sıfırla',
      'Tüm ayarları varsayılan değerlere sıfırlamak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sıfırla', style: 'destructive', onPress: () => console.log('Settings reset') }
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Genel Ayarlar',
      items: [
        {
          key: 'language',
          title: 'Dil',
          subtitle: 'Türkçe',
          type: 'select',
          onPress: handleLanguageChange
        },
        {
          key: 'theme',
          title: 'Tema',
          subtitle: 'Açık Tema',
          type: 'select',
          onPress: handleThemeChange
        },
        {
          key: 'notifications',
          title: 'Bildirimler',
          subtitle: 'Bildirimleri açık tut',
          type: 'switch',
          value: settings.notifications,
          onToggle: (value: boolean) => handleToggle('notifications', value)
        }
      ]
    },
    {
      title: 'Güvenlik & Gizlilik',
      items: [
        {
          key: 'location',
          title: 'Konum Paylaşımı',
          subtitle: 'Konum bilgilerini paylaş',
          type: 'switch',
          value: settings.location,
          onToggle: (value: boolean) => handleToggle('location', value)
        },
        {
          key: 'analytics',
          title: 'Analitik Veriler',
          subtitle: 'Kullanım verilerini paylaş',
          type: 'switch',
          value: settings.analytics,
          onToggle: (value: boolean) => handleToggle('analytics', value)
        }
      ]
    },
    {
      title: 'Veri & Senkronizasyon',
      items: [
        {
          key: 'autoSync',
          title: 'Otomatik Senkronizasyon',
          subtitle: 'Verileri otomatik senkronize et',
          type: 'switch',
          value: settings.autoSync,
          onToggle: (value: boolean) => handleToggle('autoSync', value)
        },
        {
          key: 'offlineMode',
          title: 'Çevrimdışı Mod',
          subtitle: 'İnternet bağlantısı olmadan çalış',
          type: 'switch',
          value: settings.offlineMode,
          onToggle: (value: boolean) => handleToggle('offlineMode', value)
        }
      ]
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <Text style={styles.headerSubtitle}>
          Uygulama ayarlarınızı yönetin
        </Text>
      </View>

      {settingsSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              </View>
              {item.type === 'switch' ? (
                <Switch
                  value={item.value}
                  onValueChange={item.onToggle}
                />
              ) : (
                <TouchableOpacity onPress={item.onPress}>
                  <Text style={styles.settingArrow}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Ayarları</Text>
        <View style={styles.apiContainer}>
          <Text style={styles.apiLabel}>API Anahtarı</Text>
          <TextInput
            style={styles.apiInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="API anahtarınızı girin"
            secureTextEntry
          />
          <TouchableOpacity style={styles.apiButton}>
            <Text style={styles.apiButtonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
          <Text style={styles.actionButtonText}>Önbellek Temizle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
          <Text style={styles.actionButtonText}>Verileri Dışa Aktar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleImportData}>
          <Text style={styles.actionButtonText}>Verileri İçe Aktar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gelişmiş</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={handleResetSettings}>
          <Text style={styles.dangerButtonText}>Ayarları Sıfırla</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>AyazLogistics v1.0.0</Text>
        <Text style={styles.footerText}>© 2024 AyazLogistics. Tüm hakları saklıdır.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  apiContainer: {
    marginTop: 16,
  },
  apiLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  apiInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  apiButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  apiButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 4,
  },
});

export default SettingsScreen;
