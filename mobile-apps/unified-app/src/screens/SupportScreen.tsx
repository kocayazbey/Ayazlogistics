import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking
} from 'react-native';

const SupportScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');

  const categories = [
    { key: 'general', title: 'Genel', icon: '💬' },
    { key: 'technical', title: 'Teknik', icon: '⚙️' },
    { key: 'billing', title: 'Faturalama', icon: '💳' },
    { key: 'delivery', title: 'Teslimat', icon: '🚚' },
    { key: 'account', title: 'Hesap', icon: '👤' },
    { key: 'other', title: 'Diğer', icon: '❓' }
  ];

  const priorities = [
    { key: 'low', title: 'Düşük', color: '#10B981' },
    { key: 'medium', title: 'Orta', color: '#F59E0B' },
    { key: 'high', title: 'Yüksek', color: '#EF4444' },
    { key: 'urgent', title: 'Acil', color: '#DC2626' }
  ];

  const contactMethods = [
    {
      title: 'E-posta Desteği',
      description: '24 saat içinde yanıt alın',
      icon: '📧',
      action: () => Linking.openURL('mailto:support@ayazlogistics.com')
    },
    {
      title: 'Canlı Destek',
      description: 'Anında yardım alın',
      icon: '💬',
      action: () => console.log('Live chat opened')
    },
    {
      title: 'Telefon Desteği',
      description: '7/24 telefon desteği',
      icon: '📞',
      action: () => Linking.openURL('tel:+902125550123')
    },
    {
      title: 'Video Görüşme',
      description: 'Görüntülü destek alın',
      icon: '📹',
      action: () => console.log('Video call opened')
    }
  ];

  const faqItems = [
    {
      question: 'Hesabımı nasıl oluşturabilirim?',
      answer: 'Hesap oluşturmak için "Kayıt Ol" butonuna tıklayın ve gerekli bilgileri doldurun.',
      category: 'account'
    },
    {
      question: 'Siparişimi nasıl takip edebilirim?',
      answer: 'Siparişlerinizi "Siparişlerim" bölümünden takip edebilirsiniz.',
      category: 'delivery'
    },
    {
      question: 'Ödeme yaparken sorun yaşıyorum',
      answer: 'Ödeme sorunları için destek ekibimizle iletişime geçin.',
      category: 'billing'
    },
    {
      question: 'Uygulama çöküyor',
      answer: 'Uygulamayı yeniden başlatın veya güncelleyin.',
      category: 'technical'
    }
  ];

  const handleSendMessage = () => {
    if (!message.trim()) {
      Alert.alert('Hata', 'Lütfen mesajınızı yazın');
      return;
    }
    
    Alert.alert(
      'Mesaj Gönderildi',
      'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      [{ text: 'Tamam' }]
    );
    
    setMessage('');
  };

  const handleContactMethod = (method: any) => {
    method.action();
  };

  const filteredFaqs = faqItems.filter(item => 
    selectedCategory === 'general' || item.category === selectedCategory
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Destek Merkezi</Text>
        <Text style={styles.headerSubtitle}>
          Size nasıl yardımcı olabiliriz?
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İletişim</Text>
        <View style={styles.contactMethods}>
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactMethod}
              onPress={() => handleContactMethod(method)}
            >
              <Text style={styles.contactIcon}>{method.icon}</Text>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactDescription}>{method.description}</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori Seçin</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.categoryButton,
                selectedCategory === category.key && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.key)}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
        {filteredFaqs.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Text style={styles.faqAnswer}>{item.answer}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Destek Talebi Gönder</Text>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kategori</Text>
            <View style={styles.categorySelector}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={[
                    styles.categoryOption,
                    selectedCategory === category.key && styles.categoryOptionActive
                  ]}
                  onPress={() => setSelectedCategory(category.key)}
                >
                  <Text style={styles.categoryOptionText}>{category.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Öncelik</Text>
            <View style={styles.prioritySelector}>
              {priorities.map((priorityItem) => (
                <TouchableOpacity
                  key={priorityItem.key}
                  style={[
                    styles.priorityOption,
                    { borderColor: priorityItem.color },
                    priority === priorityItem.key && { backgroundColor: priorityItem.color }
                  ]}
                  onPress={() => setPriority(priorityItem.key)}
                >
                  <Text style={[
                    styles.priorityOptionText,
                    priority === priorityItem.key && { color: '#FFFFFF' }
                  ]}>
                    {priorityItem.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mesajınız</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Sorunuzu detaylı bir şekilde açıklayın..."
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage}>
            <Text style={styles.sendButtonText}>Mesaj Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
        <View style={styles.contactInfo}>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactText}>support@ayazlogistics.com</Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactText}>+90 (212) 555-0123</Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>📍</Text>
            <Text style={styles.contactText}>İstanbul, Türkiye</Text>
          </View>
          <View style={styles.contactItem}>
            <Text style={styles.contactIcon}>🕒</Text>
            <Text style={styles.contactText}>7/24 Destek</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sosyal Medya</Text>
        <View style={styles.socialMedia}>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>📘</Text>
            <Text style={styles.socialText}>Facebook</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>🐦</Text>
            <Text style={styles.socialText}>Twitter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>💼</Text>
            <Text style={styles.socialText}>LinkedIn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialIcon}>📷</Text>
            <Text style={styles.socialText}>Instagram</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Destek ekibimiz 7/24 hizmetinizdedir
        </Text>
        <Text style={styles.footerText}>
          Ortalama yanıt süresi: 2 saat
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
    marginBottom: 16,
  },
  contactMethods: {
    marginTop: 16,
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactArrow: {
    fontSize: 20,
    color: '#9CA3AF',
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
  formContainer: {
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryOption: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryOptionActive: {
    backgroundColor: '#3B82F6',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  prioritySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  priorityOption: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  priorityOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    marginTop: 16,
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
  socialMedia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12,
  },
  socialIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  socialText: {
    fontSize: 14,
    color: '#374151',
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

export default SupportScreen;
