import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    orderUpdates: true,
    deliveryUpdates: true,
    promotional: false,
    system: true,
    security: true
  });

  const handleToggle = (key: string, value: boolean) => {
    setNotifications({
      ...notifications,
      [key]: value
    });
  };

  const handleTestNotification = () => {
    Alert.alert('Test Bildirimi', 'Test bildirimi gönderildi!');
  };

  const notificationTypes = [
    {
      key: 'push',
      title: 'Push Bildirimleri',
      description: 'Uygulama içi bildirimler',
      icon: '📱'
    },
    {
      key: 'email',
      title: 'E-posta Bildirimleri',
      description: 'E-posta ile bildirimler',
      icon: '📧'
    },
    {
      key: 'sms',
      title: 'SMS Bildirimleri',
      description: 'SMS ile bildirimler',
      icon: '💬'
    },
    {
      key: 'orderUpdates',
      title: 'Sipariş Güncellemeleri',
      description: 'Sipariş durumu değişiklikleri',
      icon: '📦'
    },
    {
      key: 'deliveryUpdates',
      title: 'Teslimat Güncellemeleri',
      description: 'Teslimat durumu değişiklikleri',
      icon: '🚚'
    },
    {
      key: 'promotional',
      title: 'Promosyon Bildirimleri',
      description: 'Kampanya ve promosyon duyuruları',
      icon: '🎉'
    },
    {
      key: 'system',
      title: 'Sistem Bildirimleri',
      description: 'Sistem bakım ve güncellemeleri',
      icon: '⚙️'
    },
    {
      key: 'security',
      title: 'Güvenlik Bildirimleri',
      description: 'Güvenlik uyarıları ve giriş bildirimleri',
      icon: '🔒'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
        <Text style={styles.headerSubtitle}>
          Hangi bildirimleri almak istediğinizi seçin
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirim Türleri</Text>
        {notificationTypes.map((type) => (
          <View key={type.key} style={styles.notificationItem}>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationIcon}>{type.icon}</Text>
              <View style={styles.notificationText}>
                <Text style={styles.notificationTitle}>{type.title}</Text>
                <Text style={styles.notificationDescription}>
                  {type.description}
                </Text>
              </View>
            </View>
            <Switch
              value={notifications[type.key as keyof typeof notifications]}
              onValueChange={(value) => handleToggle(type.key, value)}
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirim Zamanlaması</Text>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>Günlük Bildirim Saati</Text>
          <TouchableOpacity style={styles.timeButton}>
            <Text style={styles.timeButtonText}>09:00</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.timeItem}>
          <Text style={styles.timeLabel}>Bildirim Aralığı</Text>
          <TouchableOpacity style={styles.timeButton}>
            <Text style={styles.timeButtonText}>Anında</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Bildirimi</Text>
        <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
          <Text style={styles.testButtonText}>Test Bildirimi Gönder</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirim Geçmişi</Text>
        <View style={styles.historyItem}>
          <Text style={styles.historyIcon}>📦</Text>
          <View style={styles.historyText}>
            <Text style={styles.historyTitle}>Sipariş Güncellendi</Text>
            <Text style={styles.historyDescription}>
              Sipariş #12345 kargoya verildi
            </Text>
            <Text style={styles.historyTime}>2 saat önce</Text>
          </View>
        </View>
        <View style={styles.historyItem}>
          <Text style={styles.historyIcon}>🚚</Text>
          <View style={styles.historyText}>
            <Text style={styles.historyTitle}>Teslimat Bildirimi</Text>
            <Text style={styles.historyDescription}>
              Kurye yola çıktı, 30 dakika içinde teslim edilecek
            </Text>
            <Text style={styles.historyTime}>1 gün önce</Text>
          </View>
        </View>
        <View style={styles.historyItem}>
          <Text style={styles.historyIcon}>🔒</Text>
          <View style={styles.historyText}>
            <Text style={styles.historyTitle}>Güvenlik Uyarısı</Text>
            <Text style={styles.historyDescription}>
              Yeni cihazdan giriş yapıldı
            </Text>
            <Text style={styles.historyTime}>3 gün önce</Text>
          </View>
        </View>
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
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeLabel: {
    fontSize: 16,
    color: '#374151',
  },
  timeButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 4,
  },
  historyText: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  historyDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default NotificationsScreen;
