import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Rating
} from 'react-native';

const FeedbackScreen: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const categories = [
    { key: 'general', title: 'Genel', icon: '💬' },
    { key: 'feature', title: 'Özellik', icon: '✨' },
    { key: 'bug', title: 'Hata', icon: '🐛' },
    { key: 'performance', title: 'Performans', icon: '⚡' },
    { key: 'ui', title: 'Arayüz', icon: '🎨' },
    { key: 'other', title: 'Diğer', icon: '❓' }
  ];

  const ratingLabels = [
    'Çok Kötü',
    'Kötü',
    'Orta',
    'İyi',
    'Mükemmel'
  ];

  const handleSubmitFeedback = () => {
    if (rating === 0) {
      Alert.alert('Hata', 'Lütfen bir puan verin');
      return;
    }
    
    if (!feedback.trim()) {
      Alert.alert('Hata', 'Lütfen geri bildiriminizi yazın');
      return;
    }
    
    Alert.alert(
      'Geri Bildirim Gönderildi',
      'Geri bildiriminiz başarıyla gönderildi. Teşekkür ederiz!',
      [{ text: 'Tamam' }]
    );
    
    setRating(0);
    setFeedback('');
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleAnonymousToggle = () => {
    setIsAnonymous(!isAnonymous);
  };

  const feedbackTips = [
    {
      title: 'Detaylı Açıklama',
      description: 'Sorununuzu veya önerinizi mümkün olduğunca detaylı açıklayın',
      icon: '📝'
    },
    {
      title: 'Adım Adım',
      description: 'Sorunun nasıl oluştuğunu adım adım anlatın',
      icon: '👣'
    },
    {
      title: 'Ekran Görüntüsü',
      description: 'Mümkünse ekran görüntüsü ekleyin',
      icon: '📸'
    },
    {
      title: 'Cihaz Bilgisi',
      description: 'Cihaz ve uygulama versiyonunu belirtin',
      icon: '📱'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Geri Bildirim</Text>
        <Text style={styles.headerSubtitle}>
          Görüşleriniz bizim için değerli
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Puanınız</Text>
        <View style={styles.ratingContainer}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                style={styles.starButton}
                onPress={() => handleRatingChange(star)}
              >
                <Text style={[
                  styles.star,
                  star <= rating ? styles.starActive : styles.starInactive
                ]}>
                  ⭐
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating > 0 ? ratingLabels[rating - 1] : 'Puan verin'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategori Seçin</Text>
        <View style={styles.categoriesContainer}>
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
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geri Bildiriminiz</Text>
        <TextInput
          style={styles.feedbackInput}
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Geri bildiriminizi buraya yazın..."
          multiline
          numberOfLines={6}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ayarlar</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Anonim Gönder</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={handleAnonymousToggle}
          >
            <Text style={styles.toggleText}>
              {isAnonymous ? 'Açık' : 'Kapalı'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geri Bildirim İpuçları</Text>
        <View style={styles.tipsContainer}>
          {feedbackTips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={styles.tipIcon}>{tip.icon}</Text>
              <View style={styles.tipText}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Önceki Geri Bildirimler</Text>
        <View style={styles.previousFeedback}>
          <View style={styles.feedbackItem}>
            <Text style={styles.feedbackDate}>25 Ekim 2024</Text>
            <Text style={styles.feedbackCategory}>Özellik Önerisi</Text>
            <Text style={styles.feedbackText}>
              Uygulamaya dark mode özelliği eklenmesini öneriyorum.
            </Text>
            <Text style={styles.feedbackStatus}>Değerlendiriliyor</Text>
          </View>
          <View style={styles.feedbackItem}>
            <Text style={styles.feedbackDate}>20 Ekim 2024</Text>
            <Text style={styles.feedbackCategory}>Hata Bildirimi</Text>
            <Text style={styles.feedbackText}>
              Sipariş takip ekranında bazen veriler yüklenmiyor.
            </Text>
            <Text style={styles.feedbackStatus}>Çözüldü</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İletişim</Text>
        <Text style={styles.contactDescription}>
          Acil durumlar için doğrudan iletişime geçebilirsiniz:
        </Text>
        <View style={styles.contactMethods}>
          <TouchableOpacity style={styles.contactMethod}>
            <Text style={styles.contactIcon}>📧</Text>
            <Text style={styles.contactText}>feedback@ayazlogistics.com</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactMethod}>
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactText}>+90 (212) 555-0123</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.submitContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitFeedback}>
          <Text style={styles.submitButtonText}>Geri Bildirim Gönder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Geri bildirimleriniz gizlilik içinde işlenir
        </Text>
        <Text style={styles.footerText}>
          Ortalama yanıt süresi: 24 saat
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
  ratingContainer: {
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  star: {
    fontSize: 32,
  },
  starActive: {
    color: '#F59E0B',
  },
  starInactive: {
    color: '#D1D5DB',
  },
  ratingLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12,
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
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  toggleButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsContainer: {
    marginTop: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 4,
  },
  tipText: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  previousFeedback: {
    marginTop: 16,
  },
  feedbackItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  feedbackDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  feedbackCategory: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  feedbackStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  contactDescription: {
    fontSize: 14,
    color: '#6B7280',
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
    fontSize: 16,
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
  },
  submitContainer: {
    margin: 20,
    marginTop: 0,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
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

export default FeedbackScreen;
