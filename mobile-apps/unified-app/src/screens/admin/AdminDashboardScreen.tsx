import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const AdminDashboardScreen: React.FC = () => {
  const { user } = useAuth();

  const adminStats = [
    { label: 'Toplam Kullanıcı', value: '1,245', color: '#3B82F6' },
    { label: 'Aktif Siparişler', value: '89', color: '#10B981' },
    { label: 'Sistem Durumu', value: 'Normal', color: '#10B981' },
    { label: 'Günlük Gelir', value: '₺45,230', color: '#6B7280' }
  ];

  const quickActions = [
    {
      title: 'Kullanıcı Yönetimi',
      icon: '👥',
      color: '#3B82F6',
      onPress: () => console.log('User management pressed')
    },
    {
      title: 'Sistem Analitik',
      icon: '📊',
      color: '#10B981',
      onPress: () => console.log('Analytics pressed')
    },
    {
      title: 'Sistem Ayarları',
      icon: '⚙️',
      color: '#8B5CF6',
      onPress: () => console.log('System settings pressed')
    },
    {
      title: 'Raporlar',
      icon: '📋',
      color: '#F59E0B',
      onPress: () => console.log('Reports pressed')
    }
  ];

  const systemAlerts = [
    {
      type: 'warning',
      title: 'Yüksek CPU Kullanımı',
      description: 'Sunucu CPU kullanımı %85\'e ulaştı',
      time: '5 dakika önce'
    },
    {
      type: 'info',
      title: 'Yeni Kullanıcı Kaydı',
      description: '3 yeni kullanıcı bugün kayıt oldu',
      time: '1 saat önce'
    },
    {
      type: 'success',
      title: 'Yedekleme Tamamlandı',
      description: 'Günlük veritabanı yedeklemesi başarılı',
      time: '2 saat önce'
    }
  ];

  const recentActivities = [
    {
      title: 'Kullanıcı Eklendi',
      description: 'Yeni admin kullanıcısı eklendi',
      time: '10 dakika önce',
      icon: '👤'
    },
    {
      title: 'Sistem Güncellendi',
      description: 'Sistem güvenlik güncellemesi yapıldı',
      time: '1 saat önce',
      icon: '🔒'
    },
    {
      title: 'Rapor Oluşturuldu',
      description: 'Aylık performans raporu oluşturuldu',
      time: '2 saat önce',
      icon: '📊'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
          <Text style={styles.userName}>{user?.firstName || 'Admin'}</Text>
          <Text style={styles.roleText}>Sistem Yöneticisi</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.statusText}>Sistem Aktif</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Sistem İstatistikleri</Text>
        <View style={styles.statsGrid}>
          {adminStats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Yönetim Paneli</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { backgroundColor: action.color }]}
              onPress={action.onPress}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>Sistem Uyarıları</Text>
        <View style={styles.alertsList}>
          {systemAlerts.map((alert, index) => (
            <View key={index} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <View style={[styles.alertIcon, { backgroundColor: getAlertColor(alert.type) }]}>
                  <Text style={styles.alertEmoji}>{getAlertEmoji(alert.type)}</Text>
                </View>
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                </View>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
        <View style={styles.activityList}>
          {recentActivities.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityEmoji}>{activity.icon}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const getAlertColor = (type: string) => {
  switch (type) {
    case 'warning':
      return '#FEF3C7';
    case 'info':
      return '#DBEAFE';
    case 'success':
      return '#D1FAE5';
    default:
      return '#F3F4F6';
  }
};

const getAlertEmoji = (type: string) => {
  switch (type) {
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'success':
      return '✅';
    default:
      return '❓';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  alertsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  alertsList: {
    backgroundColor: '#FFFFFF',
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
  alertCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertEmoji: {
    fontSize: 20,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  recentContainer: {
    padding: 20,
    paddingTop: 0,
  },
  activityList: {
    backgroundColor: '#FFFFFF',
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default AdminDashboardScreen;
