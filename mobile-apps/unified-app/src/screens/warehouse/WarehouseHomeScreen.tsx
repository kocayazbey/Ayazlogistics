import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { CorporateTheme } from '../../styles/CorporateTheme';
import { RealTimeStatus } from '../../components/RealTimeStatus';

interface WarehouseStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  lowStockItems: number;
}

const WarehouseHomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<WarehouseStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    lowStockItems: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouseData();
  }, []);

  const loadWarehouseData = async () => {
    setLoading(true);
    try {
      // Real API call would go here
      // const response = await fetch(`${API_URL}/warehouse/stats`);
      // const data = await response.json();

      // Mock data for demo
      setStats({
        totalOrders: 45,
        pendingOrders: 12,
        completedOrders: 33,
        lowStockItems: 8,
      });
    } catch (error) {
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWarehouseData();
    setRefreshing(false);
  };

  const handleQuickAction = (action: string) => {
    Alert.alert('Hızlı İşlem', `${action} işlemi seçildi`);
    // Navigate to appropriate screen
  };

  const quickActions = [
    { title: 'Mal Kabul', icon: '📥', action: 'goods_receipt' },
    { title: 'Sevkiyat', icon: '📤', action: 'shipment' },
    { title: 'Envanter', icon: '📦', action: 'inventory' },
    { title: 'Görevler', icon: '📋', action: 'tasks' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Hoş Geldiniz, {user?.firstName}!
        </Text>
        <Text style={styles.subTitle}>Depo Yönetimi</Text>
        <RealTimeStatus />
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statNumber}>{stats.pendingOrders}</Text>
          <Text style={styles.statLabel}>Bekleyen Sipariş</Text>
        </View>

        <View style={[styles.statCard, styles.completedCard]}>
          <Text style={styles.statNumber}>{stats.completedOrders}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>

        <View style={[styles.statCard, styles.totalCard]}>
          <Text style={styles.statNumber}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Toplam Sipariş</Text>
        </View>

        <View style={[styles.statCard, styles.alertCard]}>
          <Text style={styles.statNumber}>{stats.lowStockItems}</Text>
          <Text style={styles.statLabel}>Düşük Stok</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => handleQuickAction(action.action)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>📥</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Mal Kabul Tamamlandı</Text>
              <Text style={styles.activityTime}>5 dakika önce</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>📤</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Sevkiyat Hazırlandı</Text>
              <Text style={styles.activityTime}>15 dakika önce</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>⚠️</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Düşük Stok Uyarısı</Text>
              <Text style={styles.activityTime}>1 saat önce</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Alerts */}
      {stats.lowStockItems > 0 && (
        <View style={styles.alertSection}>
          <Text style={styles.alertTitle}>⚠️ Dikkat!</Text>
          <Text style={styles.alertText}>
            {stats.lowStockItems} ürün düşük stok seviyesinde.
          </Text>
          <TouchableOpacity style={styles.alertButton}>
            <Text style={styles.alertButtonText}>Stok Yönetimine Git</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CorporateTheme.colors.gray[50],
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.gray[200],
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CorporateTheme.colors.gray[900],
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 16,
    color: CorporateTheme.colors.gray[600],
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[600],
    textAlign: 'center',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  alertCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CorporateTheme.colors.gray[900],
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CorporateTheme.colors.gray[900],
    textAlign: 'center',
  },
  activityList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.gray[100],
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: CorporateTheme.colors.gray[900],
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[500],
  },
  alertSection: {
    margin: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 12,
  },
  alertButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  alertButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default WarehouseHomeScreen;