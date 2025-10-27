import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert
} from 'react-native';

const AboutScreen: React.FC = () => {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Hata', 'Bağlantı açılamadı');
    });
  };

  const handleCheckUpdates = () => {
    Alert.alert('Güncelleme Kontrolü', 'Uygulamanız güncel!');
  };

  const handleRateApp = () => {
    Alert.alert('Değerlendirme', 'Uygulamayı değerlendirmek için mağazaya yönlendiriliyorsunuz...');
  };

  const handleShareApp = () => {
    Alert.alert('Paylaş', 'Uygulama paylaşım özelliği yakında eklenecek!');
  };

  const teamMembers = [
    {
      name: 'Ahmet Yılmaz',
      role: 'Proje Yöneticisi',
      email: 'ahmet@ayazlogistics.com'
    },
    {
      name: 'Ayşe Demir',
      role: 'Geliştirici',
      email: 'ayse@ayazlogistics.com'
    },
    {
      name: 'Mehmet Kaya',
      role: 'Tasarımcı',
      email: 'mehmet@ayazlogistics.com'
    }
  ];

  const features = [
    {
      title: 'Gerçek Zamanlı Takip',
      description: 'Siparişlerinizi anlık olarak takip edin',
      icon: '📍'
    },
    {
      title: 'Akıllı Rota Optimizasyonu',
      description: 'En kısa ve verimli rotaları otomatik hesaplar',
      icon: '🗺️'
    },
    {
      title: 'Gelişmiş Güvenlik',
      description: 'Verileriniz en yüksek güvenlik standartlarında korunur',
      icon: '🔒'
    },
    {
      title: '7/24 Destek',
      description: 'Her zaman yanınızdayız',
      icon: '🆘'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🚚</Text>
        </View>
        <Text style={styles.appName}>AyazLogistics</Text>
        <Text style={styles.appVersion}>v1.0.0</Text>
        <Text style={styles.appDescription}>
          Lojistik süreçlerinizi dijitalleştirin, verimliliğinizi artırın
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Özellikler</Text>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geliştirici Ekibi</Text>
        {teamMembers.map((member, index) => (
          <View key={index} style={styles.teamMember}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberInitial}>
                {member.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              <Text style={styles.memberEmail}>{member.email}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uygulama Bilgileri</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Versiyon</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Güncelleme Tarihi</Text>
          <Text style={styles.infoValue}>25 Ekim 2024</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>React Native</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Lisans</Text>
          <Text style={styles.infoValue}>Proprietary</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Eylemler</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleCheckUpdates}>
          <Text style={styles.actionButtonText}>Güncellemeleri Kontrol Et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleRateApp}>
          <Text style={styles.actionButtonText}>Uygulamayı Değerlendir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShareApp}>
          <Text style={styles.actionButtonText}>Uygulamayı Paylaş</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bağlantılar</Text>
        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => handleOpenLink('https://ayazlogistics.com')}
        >
          <Text style={styles.linkIcon}>🌐</Text>
          <Text style={styles.linkTitle}>Web Sitesi</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => handleOpenLink('mailto:support@ayazlogistics.com')}
        >
          <Text style={styles.linkIcon}>📧</Text>
          <Text style={styles.linkTitle}>E-posta Desteği</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => handleOpenLink('https://github.com/ayazlogistics')}
        >
          <Text style={styles.linkIcon}>💻</Text>
          <Text style={styles.linkTitle}>GitHub</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.linkItem} 
          onPress={() => handleOpenLink('https://linkedin.com/company/ayazlogistics')}
        >
          <Text style={styles.linkIcon}>💼</Text>
          <Text style={styles.linkTitle}>LinkedIn</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yasal Bilgiler</Text>
        <TouchableOpacity style={styles.legalItem}>
          <Text style={styles.legalTitle}>Kullanım Şartları</Text>
          <Text style={styles.legalArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.legalItem}>
          <Text style={styles.legalTitle}>Gizlilik Politikası</Text>
          <Text style={styles.legalArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.legalItem}>
          <Text style={styles.legalTitle}>Lisans Sözleşmesi</Text>
          <Text style={styles.legalArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 AyazLogistics. Tüm hakları saklıdır.
        </Text>
        <Text style={styles.footerText}>
          Bu uygulama lojistik süreçlerinizi dijitalleştirmek için tasarlanmıştır.
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 4,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 16,
    color: '#374151',
  },
  infoValue: {
    fontSize: 16,
    color: '#6B7280',
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
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  linkIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  linkTitle: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  linkArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  legalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  legalTitle: {
    fontSize: 16,
    color: '#374151',
  },
  legalArrow: {
    fontSize: 20,
    color: '#9CA3AF',
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

export default AboutScreen;
