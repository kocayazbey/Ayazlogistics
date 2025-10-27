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

const DriverDashboardScreen: React.FC = () => {
  const { user } = useAuth();

  const driverStats = [
    { label: 'Bugünkü Seferler', value: '8', color: '#3B82F6' },
    { label: 'Tamamlanan', value: '5', color: '#10B981' },
    { label: 'Kalan', value: '3', color: '#F59E0B' },
    { label: 'Toplam Mesafe', value: '245 km', color: '#6B7280' }
  ];

  const quickActions = [
    {
      title: 'Rota Başlat',
      icon: '🚀',
      color: '#10B981',
      onPress: () => console.log('Start route pressed')
    },
    {
      title: 'Teslimat',
      icon: '📦',
      color: '#3B82F6',
      onPress: () => console.log('Delivery pressed')
    },
    {
      title: 'Araç Durumu',
      icon: '🚛',
      color: '#F59E0B',
      onPress: () => console.log('Vehicle status pressed')
    },
    {
      title: 'Mola',
      icon: '☕',
      color: '#8B5CF6',
      onPress: () => console.log('Break pressed')
    }
  ];

  const currentRoute = {
    id: 'RT001',
    name: 'İstanbul Merkez Rota',
    status: 'active',
    progress: 65,
    nextStop: 'ABC Teknoloji',
    estimatedArrival: '14:30',
    totalStops: 8,
    completedStops: 5
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
          <Text style={styles.userName}>{user?.firstName || 'Sürücü'}</Text>
          <Text style={styles.roleText}>Sürücü</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.statusText}>Aktif</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <Text style={styles.sectionTitle}>Aktif Rota</Text>
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeName}>{currentRoute.name}</Text>
            <Text style={styles.routeStatus}>{currentRoute.status}</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${currentRoute.progress}%` }]} 
              />
            </View>
            <Text style={styles.progressText}>{currentRoute.progress}% Tamamlandı</Text>
          </View>
          <View style={styles.routeInfo}>
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoLabel}>Sonraki Durak</Text>
              <Text style={styles.routeInfoValue}>{currentRoute.nextStop}</Text>
            </View>
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoLabel}>Tahmini Varış</Text>
              <Text style={styles.routeInfoValue}>{currentRoute.estimatedArrival}</Text>
            </View>
            <View style={styles.routeInfoItem}>
              <Text style={styles.routeInfoLabel}>Durak Sayısı</Text>
              <Text style={styles.routeInfoValue}>{currentRoute.completedStops}/{currentRoute.totalStops}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>İstatistikler</Text>
        <View style={styles.statsGrid}>
          {driverStats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { borderLeftColor: stat.color }]}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
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

      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>🚚</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Teslimat Tamamlandı</Text>
              <Text style={styles.activityDescription}>ABC Teknoloji - Sipariş #12345</Text>
              <Text style={styles.activityTime}>30 dakika önce</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>📍</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Konum Güncellendi</Text>
              <Text style={styles.activityDescription}>Araç konumu güncellendi</Text>
              <Text style={styles.activityTime}>1 saat önce</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>⛽</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Yakıt Alındı</Text>
              <Text style={styles.activityDescription}>50L yakıt alındı</Text>
              <Text style={styles.activityTime}>2 saat önce</Text>
            </View>
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
  routeContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  routeCard: {
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
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  routeStatus: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  routeInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  routeInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  routeInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
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

export default DriverDashboardScreen;
