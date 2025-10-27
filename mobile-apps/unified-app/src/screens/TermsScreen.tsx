import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';

const TermsScreen: React.FC = () => {
  const handleAcceptTerms = () => {
    Alert.alert('Kabul Edildi', 'Kullanım şartları kabul edildi');
  };

  const handleRejectTerms = () => {
    Alert.alert('Reddedildi', 'Kullanım şartları reddedildi');
  };

  const handleDownloadTerms = () => {
    Alert.alert('İndiriliyor', 'Kullanım şartları belgesi indiriliyor...');
  };

  const handlePrintTerms = () => {
    Alert.alert('Yazdırılıyor', 'Kullanım şartları belgesi yazdırılıyor...');
  };

  const sections = [
    {
      title: '1. Hizmet Tanımı',
      content: 'AyazLogistics, lojistik süreçlerinizi dijitalleştirmek ve optimize etmek için geliştirilmiş bir platformdur. Platform, sipariş yönetimi, envanter takibi, rota optimizasyonu ve teslimat süreçlerini kapsayan kapsamlı bir lojistik çözümü sunar.'
    },
    {
      title: '2. Kullanıcı Yükümlülükleri',
      content: 'Kullanıcılar, platformu yasalara uygun şekilde kullanmakla yükümlüdür. Sahte bilgi girişi, dolandırıcılık, spam veya zararlı içerik paylaşımı yasaktır. Kullanıcılar, hesap güvenliğini sağlamak ve şifrelerini korumakla yükümlüdür.'
    },
    {
      title: '3. Hizmet Kullanımı',
      content: 'Platform 7/24 erişilebilir olacak şekilde tasarlanmıştır, ancak bakım, güncelleme veya teknik sorunlar nedeniyle geçici olarak erişilemeyebilir. Kullanıcılar, hizmet kesintilerinden haberdar edilecektir.'
    },
    {
      title: '4. Veri Güvenliği',
      content: 'Tüm kullanıcı verileri SSL şifreleme ile korunur. Veriler, yasal yükümlülükler ve güvenlik gereksinimleri dışında üçüncü taraflarla paylaşılmaz. Kullanıcılar, veri işleme politikamızı kabul etmiş sayılır.'
    },
    {
      title: '5. Fikri Mülkiyet',
      content: 'Platform ve tüm içerikleri AyazLogistics\'e aittir. Kullanıcılar, platformu ticari amaçlarla kopyalayamaz, dağıtamaz veya tersine mühendislik yapamaz. Tüm telif hakkı ve ticari marka korumaları geçerlidir.'
    },
    {
      title: '6. Hizmet Değişiklikleri',
      content: 'AyazLogistics, hizmetleri önceden bildirim yaparak değiştirme, güncelleme veya sonlandırma hakkını saklı tutar. Önemli değişiklikler kullanıcılara e-posta veya platform içi bildirim ile duyurulur.'
    },
    {
      title: '7. Sorumluluk Sınırları',
      content: 'AyazLogistics, platform kullanımından kaynaklanan dolaylı zararlardan sorumlu değildir. Hizmet kesintileri, veri kaybı veya güvenlik ihlalleri durumunda sorumluluk sınırlıdır. Kullanıcılar, platformu kendi riskleri ile kullanır.'
    },
    {
      title: '8. Hesap Sonlandırma',
      content: 'Kullanıcılar, hesaplarını istediği zaman sonlandırabilir. AyazLogistics, şartları ihlal eden hesapları önceden bildirim yaparak sonlandırma hakkını saklı tutar. Hesap sonlandırıldığında, veriler 30 gün içinde silinir.'
    },
    {
      title: '9. Uyuşmazlık Çözümü',
      content: 'Taraflar arasında çıkan uyuşmazlıklar öncelikle dostane yollarla çözülmeye çalışılır. Çözülemediği takdirde, İstanbul Mahkemeleri yetkilidir. Türk hukuku geçerlidir.'
    },
    {
      title: '10. Genel Hükümler',
      content: 'Bu şartlar, platform kullanımı için geçerlidir. Şartlarda belirtilmeyen konular için Türk hukuku ve genel teamüller uygulanır. Şartların bir kısmının geçersiz olması, diğer kısımların geçerliliğini etkilemez.'
    }
  ];

  const keyPoints = [
    {
      title: 'Hizmet Kapsamı',
      description: 'Kapsamlı lojistik yönetim çözümü',
      icon: '📦'
    },
    {
      title: 'Güvenlik',
      description: 'SSL şifreleme ve güvenli veri saklama',
      icon: '🔒'
    },
    {
      title: '7/24 Destek',
      description: 'Kesintisiz teknik destek hizmeti',
      icon: '🆘'
    },
    {
      title: 'Güncellemeler',
      description: 'Düzenli platform güncellemeleri',
      icon: '🔄'
    },
    {
      title: 'Veri Koruma',
      description: 'KVKK ve GDPR uyumlu veri işleme',
      icon: '🛡️'
    },
    {
      title: 'Kullanıcı Hakları',
      description: 'Şeffaf ve adil kullanım şartları',
      icon: '⚖️'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kullanım Şartları</Text>
        <Text style={styles.headerSubtitle}>
          AyazLogistics platformunu kullanmadan önce lütfen bu şartları okuyun
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Önemli Noktalar</Text>
        <View style={styles.keyPointsContainer}>
          {keyPoints.map((point, index) => (
            <View key={index} style={styles.keyPointItem}>
              <Text style={styles.keyPointIcon}>{point.icon}</Text>
              <View style={styles.keyPointText}>
                <Text style={styles.keyPointTitle}>{point.title}</Text>
                <Text style={styles.keyPointDescription}>{point.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kullanım Şartları</Text>
        <Text style={styles.sectionDescription}>
          Aşağıdaki şartlar, AyazLogistics platformunu kullanırken geçerlidir. 
          Platformu kullanarak bu şartları kabul etmiş sayılırsınız.
        </Text>
        
        {sections.map((section, index) => (
          <View key={index} style={styles.termsSection}>
            <Text style={styles.termsSectionTitle}>{section.title}</Text>
            <Text style={styles.termsSectionContent}>{section.content}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kabul ve Red</Text>
        <Text style={styles.sectionDescription}>
          Bu kullanım şartlarını kabul etmek veya reddetmek için aşağıdaki butonları kullanabilirsiniz.
        </Text>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptTerms}>
            <Text style={styles.acceptButtonText}>Kabul Et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={handleRejectTerms}>
            <Text style={styles.rejectButtonText}>Reddet</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Belge İşlemleri</Text>
        <TouchableOpacity style={styles.documentButton} onPress={handleDownloadTerms}>
          <Text style={styles.documentButtonText}>Belgeyi İndir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.documentButton} onPress={handlePrintTerms}>
          <Text style={styles.documentButtonText}>Belgeyi Yazdır</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İletişim</Text>
        <Text style={styles.sectionDescription}>
          Kullanım şartları hakkında sorularınız için:
        </Text>
        <View style={styles.contactItem}>
          <Text style={styles.contactIcon}>📧</Text>
          <Text style={styles.contactText}>legal@ayazlogistics.com</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Yasal Uyarı</Text>
        <Text style={styles.legalWarning}>
          Bu kullanım şartları, Türk hukuku çerçevesinde hazırlanmıştır. 
          Platformu kullanarak, bu şartları kabul etmiş ve Türk hukukuna 
          tabi olmayı kabul etmiş sayılırsınız.
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Son güncelleme: 25 Ekim 2024
        </Text>
        <Text style={styles.footerText}>
          Bu şartlar düzenli olarak güncellenmektedir.
        </Text>
        <Text style={styles.footerText}>
          © 2024 AyazLogistics. Tüm hakları saklıdır.
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
  keyPointsContainer: {
    marginTop: 16,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  keyPointIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  keyPointText: {
    flex: 1,
  },
  keyPointTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  keyPointDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  termsSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  termsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  termsSectionContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  documentButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  documentButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
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
  legalWarning: {
    fontSize: 14,
    color: '#EF4444',
    lineHeight: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
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

export default TermsScreen;
