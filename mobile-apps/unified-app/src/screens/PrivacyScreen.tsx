import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';

const PrivacyScreen: React.FC = () => {
  const handleAcceptAll = () => {
    Alert.alert('Onaylandı', 'Tüm çerezler kabul edildi');
  };

  const handleRejectAll = () => {
    Alert.alert('Reddedildi', 'Tüm çerezler reddedildi');
  };

  const handleCustomize = () => {
    Alert.alert('Özelleştir', 'Çerez ayarları özelleştirilecek');
  };

  const cookieTypes = [
    {
      title: 'Gerekli Çerezler',
      description: 'Web sitesinin temel işlevlerini yerine getirmek için gerekli olan çerezler.',
      required: true,
      enabled: true
    },
    {
      title: 'Analitik Çerezler',
      description: 'Web sitesinin kullanımını analiz etmek ve performansını ölçmek için kullanılan çerezler.',
      required: false,
      enabled: false
    },
    {
      title: 'Pazarlama Çerezleri',
      description: 'Kullanıcı deneyimini kişiselleştirmek ve hedefli reklamlar göstermek için kullanılan çerezler.',
      required: false,
      enabled: false
    },
    {
      title: 'Sosyal Medya Çerezleri',
      description: 'Sosyal medya platformları ile entegrasyon için kullanılan çerezler.',
      required: false,
      enabled: false
    }
  ];

  const dataTypes = [
    {
      title: 'Kişisel Bilgiler',
      description: 'Ad, soyad, e-posta adresi, telefon numarası gibi kişisel bilgileriniz.',
      purpose: 'Hesap oluşturma ve kimlik doğrulama'
    },
    {
      title: 'Kullanım Verileri',
      description: 'Uygulamayı nasıl kullandığınız, hangi özellikleri kullandığınız gibi veriler.',
      purpose: 'Hizmet kalitesini artırma ve yeni özellikler geliştirme'
    },
    {
      title: 'Konum Verileri',
      description: 'GPS koordinatları, adres bilgileri gibi konum verileriniz.',
      purpose: 'Teslimat ve rota optimizasyonu'
    },
    {
      title: 'Cihaz Bilgileri',
      description: 'Cihaz türü, işletim sistemi, tarayıcı bilgileri gibi teknik veriler.',
      purpose: 'Uygulama performansını optimize etme'
    }
  ];

  const rights = [
    {
      title: 'Bilgi Alma Hakkı',
      description: 'Hangi kişisel verilerinizin işlendiğini öğrenme hakkı'
    },
    {
      title: 'Düzeltme Hakkı',
      description: 'Yanlış veya eksik verilerinizi düzeltme hakkı'
    },
    {
      title: 'Silme Hakkı',
      description: 'Belirli koşullarda verilerinizin silinmesini isteme hakkı'
    },
    {
      title: 'Kısıtlama Hakkı',
      description: 'Verilerinizin işlenmesinin kısıtlanmasını isteme hakkı'
    },
    {
      title: 'Taşınabilirlik Hakkı',
      description: 'Verilerinizi başka bir hizmet sağlayıcıya aktarma hakkı'
    },
    {
      title: 'İtiraz Hakkı',
      description: 'Verilerinizin işlenmesine itiraz etme hakkı'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gizlilik & Çerez Politikası</Text>
        <Text style={styles.headerSubtitle}>
          Kişisel verilerinizin korunması bizim için önemlidir
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Çerez Ayarları</Text>
        <Text style={styles.sectionDescription}>
          Web sitemizde size en iyi deneyimi sunmak için çerezler kullanıyoruz. 
          Hangi çerezleri kabul etmek istediğinizi seçebilirsiniz.
        </Text>
        
        {cookieTypes.map((cookie, index) => (
          <View key={index} style={styles.cookieItem}>
            <View style={styles.cookieInfo}>
              <Text style={styles.cookieTitle}>{cookie.title}</Text>
              <Text style={styles.cookieDescription}>{cookie.description}</Text>
              {cookie.required && (
                <Text style={styles.requiredLabel}>Gerekli</Text>
              )}
            </View>
            <View style={styles.cookieStatus}>
              <Text style={styles.cookieStatusText}>
                {cookie.enabled ? 'Açık' : 'Kapalı'}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.cookieActions}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptAll}>
            <Text style={styles.acceptButtonText}>Tümünü Kabul Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={handleRejectAll}>
            <Text style={styles.rejectButtonText}>Tümünü Reddet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.customizeButton} onPress={handleCustomize}>
            <Text style={styles.customizeButtonText}>Özelleştir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Toplanan Veri Türleri</Text>
        <Text style={styles.sectionDescription}>
          Hizmetlerimizi sunabilmek için aşağıdaki türde veriler topluyoruz:
        </Text>
        
        {dataTypes.map((data, index) => (
          <View key={index} style={styles.dataItem}>
            <Text style={styles.dataTitle}>{data.title}</Text>
            <Text style={styles.dataDescription}>{data.description}</Text>
            <Text style={styles.dataPurpose}>
              <Text style={styles.purposeLabel}>Amaç: </Text>
              {data.purpose}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri Kullanım Amaçları</Text>
        <View style={styles.purposeItem}>
          <Text style={styles.purposeIcon}>🔐</Text>
          <Text style={styles.purposeText}>Hesap güvenliği ve kimlik doğrulama</Text>
        </View>
        <View style={styles.purposeItem}>
          <Text style={styles.purposeIcon}>📦</Text>
          <Text style={styles.purposeText}>Sipariş işleme ve teslimat</Text>
        </View>
        <View style={styles.purposeItem}>
          <Text style={styles.purposeIcon}>📊</Text>
          <Text style={styles.purposeText}>Hizmet kalitesini artırma</Text>
        </View>
        <View style={styles.purposeItem}>
          <Text style={styles.purposeIcon}>🎯</Text>
          <Text style={styles.purposeText}>Kişiselleştirilmiş deneyim sunma</Text>
        </View>
        <View style={styles.purposeItem}>
          <Text style={styles.purposeIcon}>📱</Text>
          <Text style={styles.purposeText}>Teknik destek ve sorun giderme</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri Paylaşımı</Text>
        <Text style={styles.sectionDescription}>
          Kişisel verilerinizi aşağıdaki durumlarda paylaşabiliriz:
        </Text>
        <View style={styles.sharingItem}>
          <Text style={styles.sharingIcon}>🤝</Text>
          <Text style={styles.sharingText}>Hizmet sağlayıcılarımızla (kargo, ödeme vb.)</Text>
        </View>
        <View style={styles.sharingItem}>
          <Text style={styles.sharingIcon}>⚖️</Text>
          <Text style={styles.sharingText}>Yasal yükümlülüklerimizi yerine getirmek için</Text>
        </View>
        <View style={styles.sharingItem}>
          <Text style={styles.sharingIcon}>🛡️</Text>
          <Text style={styles.sharingText}>Güvenlik ve dolandırıcılık önleme için</Text>
        </View>
        <View style={styles.sharingItem}>
          <Text style={styles.sharingIcon}>✅</Text>
          <Text style={styles.sharingText}>Açık rızanız olduğunda</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Haklarınız</Text>
        <Text style={styles.sectionDescription}>
          KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:
        </Text>
        
        {rights.map((right, index) => (
          <View key={index} style={styles.rightItem}>
            <Text style={styles.rightTitle}>{right.title}</Text>
            <Text style={styles.rightDescription}>{right.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri Güvenliği</Text>
        <View style={styles.securityItem}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>SSL şifreleme ile veri koruması</Text>
        </View>
        <View style={styles.securityItem}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <Text style={styles.securityText}>Güvenli sunucu altyapısı</Text>
        </View>
        <View style={styles.securityItem}>
          <Text style={styles.securityIcon}>👥</Text>
          <Text style={styles.securityText}>Sınırlı personel erişimi</Text>
        </View>
        <View style={styles.securityItem}>
          <Text style={styles.securityIcon}>📋</Text>
          <Text style={styles.securityText}>Düzenli güvenlik denetimleri</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İletişim</Text>
        <Text style={styles.sectionDescription}>
          Gizlilik politikamız hakkında sorularınız için:
        </Text>
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📧</Text>
          <Text style={styles.contactText}>privacy@ayazlogistics.com</Text>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📞</Text>
          <Text style={styles.contactText}>+90 (212) 555-0123</Text>
        </View>
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📍</Text>
          <Text style={styles.contactText}>İstanbul, Türkiye</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Son güncelleme: 25 Ekim 2024
        </Text>
        <Text style={styles.footerText}>
          Bu politika düzenli olarak güncellenmektedir.
        </Text>
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  cookieItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cookieInfo: {
    flex: 1,
  },
  cookieTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  cookieDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  requiredLabel: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  cookieStatus: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cookieStatusText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  cookieActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  customizeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  customizeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dataItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  dataDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  dataPurpose: {
    fontSize: 14,
    color: '#6B7280',
  },
  purposeLabel: {
    fontWeight: '600',
    color: '#374151',
  },
  purposeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  purposeIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  purposeText: {
    fontSize: 14,
    color: '#374151',
  },
  sharingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sharingIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  sharingText: {
    fontSize: 14,
    color: '#374151',
  },
  rightItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  rightDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  securityText: {
    fontSize: 14,
    color: '#374151',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
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

export default PrivacyScreen;
