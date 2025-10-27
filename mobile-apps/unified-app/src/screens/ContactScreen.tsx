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

const ContactScreen: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [selectedDepartment, setSelectedDepartment] = useState('general');

  const departments = [
    { key: 'general', title: 'Genel', icon: '💬' },
    { key: 'sales', title: 'Satış', icon: '💰' },
    { key: 'support', title: 'Destek', icon: '🆘' },
    { key: 'technical', title: 'Teknik', icon: '⚙️' },
    { key: 'billing', title: 'Faturalama', icon: '💳' },
    { key: 'partnership', title: 'Ortaklık', icon: '🤝' }
  ];

  const contactMethods = [
    {
      title: 'E-posta',
      description: '24 saat içinde yanıt alın',
      icon: '📧',
      value: 'info@ayazlogistics.com',
      action: () => Linking.openURL('mailto:info@ayazlogistics.com')
    },
    {
      title: 'Telefon',
      description: '7/24 telefon desteği',
      icon: '📞',
      value: '+90 (212) 555-0123',
      action: () => Linking.openURL('tel:+902125550123')
    },
    {
      title: 'WhatsApp',
      description: 'Anında mesajlaşma',
      icon: '💬',
      value: '+90 (212) 555-0123',
      action: () => Linking.openURL('https://wa.me/902125550123')
    },
    {
      title: 'Adres',
      description: 'Ofis adresimiz',
      icon: '📍',
      value: 'İstanbul, Türkiye',
      action: () => Linking.openURL('https://maps.google.com')
    }
  ];

  const officeHours = [
    { day: 'Pazartesi - Cuma', hours: '09:00 - 18:00' },
    { day: 'Cumartesi', hours: '10:00 - 16:00' },
    { day: 'Pazar', hours: 'Kapalı' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleDepartmentSelect = (department: string) => {
    setSelectedDepartment(department);
  };

  const handleSubmitForm = () => {
    if (!formData.name || !formData.email || !formData.message) {
      Alert.alert('Hata', 'Lütfen tüm gerekli alanları doldurun');
      return;
    }
    
    Alert.alert(
      'Mesaj Gönderildi',
      'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      [{ text: 'Tamam' }]
    );
    
    setFormData({
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: ''
    });
  };

  const handleContactMethod = (method: any) => {
    method.action();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İletişim</Text>
        <Text style={styles.headerSubtitle}>
          Bizimle iletişime geçin
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
                <Text style={styles.contactValue}>{method.value}</Text>
              </View>
              <Text style={styles.contactArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Departman Seçin</Text>
        <View style={styles.departmentsContainer}>
          {departments.map((department) => (
            <TouchableOpacity
              key={department.key}
              style={[
                styles.departmentButton,
                selectedDepartment === department.key && styles.departmentButtonActive
              ]}
              onPress={() => handleDepartmentSelect(department.key)}
            >
              <Text style={styles.departmentIcon}>{department.icon}</Text>
              <Text style={[
                styles.departmentTitle,
                selectedDepartment === department.key && styles.departmentTitleActive
              ]}>
                {department.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İletişim Formu</Text>
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Ad Soyad *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              placeholder="Adınızı ve soyadınızı girin"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>E-posta *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="E-posta adresinizi girin"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              placeholder="Telefon numaranızı girin"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Konu</Text>
            <TextInput
              style={styles.input}
              value={formData.subject}
              onChangeText={(value) => handleInputChange('subject', value)}
              placeholder="Mesaj konusunu girin"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mesaj *</Text>
            <TextInput
              style={styles.messageInput}
              value={formData.message}
              onChangeText={(value) => handleInputChange('message', value)}
              placeholder="Mesajınızı buraya yazın..."
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitForm}>
            <Text style={styles.submitButtonText}>Mesaj Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Çalışma Saatleri</Text>
        <View style={styles.hoursContainer}>
          {officeHours.map((schedule, index) => (
            <View key={index} style={styles.hoursItem}>
              <Text style={styles.hoursDay}>{schedule.day}</Text>
              <Text style={styles.hoursTime}>{schedule.hours}</Text>
            </View>
          ))}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ofis Bilgileri</Text>
        <View style={styles.officeInfo}>
          <View style={styles.officeItem}>
            <Text style={styles.officeIcon}>🏢</Text>
            <View style={styles.officeText}>
              <Text style={styles.officeTitle}>Ana Ofis</Text>
              <Text style={styles.officeAddress}>
                AyazLogistics A.Ş.{'\n'}
                İstanbul, Türkiye
              </Text>
            </View>
          </View>
          <View style={styles.officeItem}>
            <Text style={styles.officeIcon}>🚚</Text>
            <View style={styles.officeText}>
              <Text style={styles.officeTitle}>Depo</Text>
              <Text style={styles.officeAddress}>
                Lojistik Merkezi{'\n'}
                İstanbul, Türkiye
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sorularınız için 7/24 hizmetinizdeyiz
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
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  contactArrow: {
    fontSize: 20,
    color: '#9CA3AF',
  },
  departmentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  departmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    marginBottom: 12,
  },
  departmentButtonActive: {
    backgroundColor: '#3B82F6',
  },
  departmentIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  departmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  departmentTitleActive: {
    color: '#FFFFFF',
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
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  hoursContainer: {
    marginTop: 16,
  },
  hoursItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  hoursDay: {
    fontSize: 16,
    color: '#374151',
  },
  hoursTime: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
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
  officeInfo: {
    marginTop: 16,
  },
  officeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  officeIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 4,
  },
  officeText: {
    flex: 1,
  },
  officeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  officeAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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

export default ContactScreen;
