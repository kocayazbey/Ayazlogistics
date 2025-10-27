import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';

const HelpScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { key: 'all', title: 'Tümü', icon: '📚' },
    { key: 'getting-started', title: 'Başlangıç', icon: '🚀' },
    { key: 'orders', title: 'Siparişler', icon: '📦' },
    { key: 'delivery', title: 'Teslimat', icon: '🚚' },
    { key: 'account', title: 'Hesap', icon: '👤' },
    { key: 'technical', title: 'Teknik', icon: '⚙️' }
  ];

  const faqItems = [
    {
      id: 1,
      category: 'getting-started',
      question: 'Uygulamayı nasıl kullanmaya başlayabilirim?',
      answer: 'Uygulamayı kullanmaya başlamak için önce hesabınızı oluşturun. Ardından profil bilgilerinizi tamamlayın ve ilk siparişinizi verin.'
    },
    {
      id: 2,
      category: 'orders',
      question: 'Siparişimi nasıl takip edebilirim?',
      answer: 'Siparişinizi takip etmek için "Siparişlerim" bölümüne gidin. Burada siparişinizin mevcut durumunu görebilirsiniz.'
    },
    {
      id: 3,
      category: 'delivery',
      question: 'Teslimat süresi ne kadar?',
      answer: 'Teslimat süresi genellikle 1-3 iş günü arasındadır. Acil teslimat seçeneği ile aynı gün teslimat da mümkündür.'
    },
    {
      id: 4,
      category: 'account',
      question: 'Şifremi nasıl değiştirebilirim?',
      answer: 'Şifrenizi değiştirmek için "Profil" > "Güvenlik" bölümüne gidin ve "Şifre Değiştir" seçeneğini kullanın.'
    },
    {
      id: 5,
      category: 'technical',
      question: 'Uygulama çöküyor, ne yapmalıyım?',
      answer: 'Uygulama çöküyorsa, önce uygulamayı kapatıp yeniden açmayı deneyin. Sorun devam ederse, cihazınızı yeniden başlatın.'
    }
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Destek İletişim',
      'Hangi yöntemle iletişime geçmek istiyorsunuz?',
      [
        { text: 'E-posta', onPress: () => console.log('Email support') },
        { text: 'Telefon', onPress: () => console.log('Phone support') },
        { text: 'Canlı Destek', onPress: () => console.log('Live chat') },
        { text: 'İptal', style: 'cancel' }
      ]
    );
  };

  const filteredFaqs = faqItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yardım & Destek</Text>
        <Text style={styles.headerSubtitle}>
          Sorularınızın cevaplarını bulun
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Sorunuzu arayın..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.categoryButtonActive
              ]}
              onPress={() => handleCategorySelect(category.key)}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryTitle,
                selectedCategory === category.key && styles.categoryTitleActive
              ]}>
                {category.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.faqContainer}>
        <Text style={styles.faqTitle}>Sık Sorulan Sorular</Text>
        {filteredFaqs.map((item) => (
          <View key={item.id} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        ))}
      </View>

      <View style={styles.contactContainer}>
        <Text style={styles.contactTitle}>Hala Yardıma İhtiyacınız Var mı?</Text>
        <Text style={styles.contactSubtitle}>
          Sorunuzun cevabını bulamadıysanız, destek ekibimizle iletişime geçin.
        </Text>
        <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
          <Text style={styles.contactButtonText}>Destek İletişim</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resourcesContainer}>
        <Text style={styles.resourcesTitle}>Kaynaklar</Text>
        <TouchableOpacity style={styles.resourceItem}>
          <Text style={styles.resourceIcon}>📖</Text>
          <Text style={styles.resourceTitle}>Kullanım Kılavuzu</Text>
          <Text style={styles.resourceArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resourceItem}>
          <Text style={styles.resourceIcon}>🎥</Text>
          <Text style={styles.resourceTitle}>Video Eğitimler</Text>
          <Text style={styles.resourceArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resourceItem}>
          <Text style={styles.resourceIcon}>💬</Text>
          <Text style={styles.resourceTitle}>Topluluk Forumu</Text>
          <Text style={styles.resourceArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resourceItem}>
          <Text style={styles.resourceIcon}>📋</Text>
          <Text style={styles.resourceTitle}>Güncelleme Notları</Text>
          <Text style={styles.resourceArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sorularınız için 7/24 destek alabilirsiniz
        </Text>
        <Text style={styles.footerText}>
          E-posta: support@ayazlogistics.com
        </Text>
        <Text style={styles.footerText}>
          Telefon: +90 (212) 555-0123
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
  searchContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
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
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  categoriesContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#3B82F6',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryTitleActive: {
    color: '#FFFFFF',
  },
  faqContainer: {
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
  faqTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  contactContainer: {
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
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  contactButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resourcesContainer: {
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
  resourcesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resourceIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  resourceTitle: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  resourceArrow: {
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

export default HelpScreen;