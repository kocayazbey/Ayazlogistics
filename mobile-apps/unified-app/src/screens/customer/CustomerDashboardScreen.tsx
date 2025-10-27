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

const CustomerDashboardScreen: React.FC = () => {
  const { user } = useAuth();

  const customerStats = [
    { label: 'Aktif Siparişler', value: '3', color: '#3B82F6' },
    { label: 'Tamamlanan', value: '28', color: '#10B981' },
    { label: 'Bekleyen', value: '1', color: '#F59E0B' },
    { label: 'Toplam Harcama', value: '₺12,450', color: '#6B7280' }
  ];

  const quickActions = [
    {
      title: 'Yeni Sipariş',
      icon: '➕',
      color: '#10B981',
      onPress: () => console.log('New order pressed')
    },
    {
      title: 'Sipariş Takip',
      icon: '📍',
      color: '#3B82F6',
      onPress: () => console.log('Order tracking pressed')
    },
    {
      title: 'Geçmiş Siparişler',
      icon: '📋',
      color: '#8B5CF6',
      onPress: () => console.log('Order history pressed')
    },
    {
      title: 'Destek',
      icon: '🆘',
      color: '#F59E0B',
      onPress: () => console.log('Support pressed')
    }
  ];

  const recentOrders = [
    {
      id: 'ORD001',
      status: 'in_transit',
      statusText: 'Yolda',
      statusColor: '#3B82F6',
      description: 'İstanbul, Kadıköy',
      time: '2 saat önce',
      estimatedDelivery: '14:30'
    },
    {
      id: 'ORD002',
      status: 'delivered',
      statusText: 'Teslim Edildi',
      statusColor: '#10B981',
      description: 'Ankara, Çankaya',
      time: '1 gün önce',
      estimatedDelivery: '10:15'
    },
    {
      id: 'ORD003',
      status: 'preparing',
      statusText: 'Hazırlanıyor',
      statusColor: '#F59E0B',
      description: 'İzmir, Konak',
      time: '2 gün önce',
      estimatedDelivery: '16:00'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
          <Text style={styles.userName}>{user?.firstName || 'Müşteri'}</Text>
          <Text style={styles.roleText}>Müşteri</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>👤</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>İstatistikler</Text>
        <View style={styles.statsGrid}>
          {customerStats.map((stat, index) => (
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

      <View style={styles.ordersContainer}>
        <Text style={styles.sectionTitle}>Son Siparişler</Text>
        <View style={styles.ordersList}>
          {recentOrders.map((order, index) => (
            <TouchableOpacity key={index} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.orderId}>#{order.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: order.statusColor }]}>
                  <Text style={styles.statusText}>{order.statusText}</Text>
                </View>
              </View>
              <Text style={styles.orderDescription}>{order.description}</Text>
              <View style={styles.orderFooter}>
                <Text style={styles.orderTime}>{order.time}</Text>
                {order.estimatedDelivery && (
                  <Text style={styles.estimatedDelivery}>
                    Tahmini: {order.estimatedDelivery}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>📦</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Sipariş Oluşturuldu</Text>
              <Text style={styles.activityDescription}>Yeni sipariş #ORD001 oluşturuldu</Text>
              <Text style={styles.activityTime}>2 saat önce</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>🚚</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Teslimat Tamamlandı</Text>
              <Text style={styles.activityDescription}>Sipariş #ORD002 teslim edildi</Text>
              <Text style={styles.activityTime}>1 gün önce</Text>
            </View>
          </View>
          
          <View style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityEmoji}>💰</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Ödeme Alındı</Text>
              <Text style={styles.activityDescription}>₺1,250 ödeme alındı</Text>
              <Text style={styles.activityTime}>2 gün önce</Text>
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
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    fontSize: 24,
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
  ordersContainer: {
    padding: 20,
    paddingTop: 0,
  },
  ordersList: {
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
  orderCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  orderDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  estimatedDelivery: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
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

export default CustomerDashboardScreen;
