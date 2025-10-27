import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { CorporateTheme } from '../../styles/CorporateTheme';
import { RealTimeStatus } from '../../components/RealTimeStatus';

interface ForkliftStats {
  todayTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalPallets: number;
  currentLocation: string;
  batteryLevel: number;
}

const ForkliftHomeScreen: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ForkliftStats>({
    todayTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalPallets: 0,
    currentLocation: 'Depo A - Koridor 1',
    batteryLevel: 85,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadForkliftData();
  }, []);

  const loadForkliftData = async () => {
    setLoading(true);
    try {
      // Real API call would go here
      // const response = await fetch(`${API_URL}/forklift/stats`);
      // const data = await response.json();

      // Mock data for demo
      setStats({
        todayTasks: 24,
        completedTasks: 18,
        pendingTasks: 6,
        totalPallets: 156,
        currentLocation: 'Depo A - Koridor 3',
        batteryLevel: Math.floor(Math.random() * 40) + 60, // 60-100%
      });
    } catch (error) {
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadForkliftData();
    setRefreshing(false);
  };

  const handleTaskAction = (action: string) => {
    Alert.alert('Görev', `${action} işlemi başlatılıyor...`);
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return '#10B981';
    if (level > 20) return '#F59E0B';
    return '#EF4444';
  };

  const getBatteryIcon = (level: number) => {
    if (level > 50) return '🔋';
    if (level > 20) return '🪫';
    return '⚠️';
  };

  const taskActions = [
    { title: 'Mal Kabul', icon: '📥', action: 'incoming_goods', color: '#10B981' },
    { title: 'Raf Düzenleme', icon: '📦', action: 'shelf_arrangement', color: '#3B82F6' },
    { title: 'Palet Toplama', icon: '📋', action: 'pallet_collection', color: '#8B5CF6' },
    { title: 'Sevkiyat', icon: '📤', action: 'outgoing_shipment', color: '#F59E0B' },
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
        <Text style={styles.subTitle}>Forklift Operatörü</Text>
        <RealTimeStatus />
      </View>

      {/* Status Cards */}
      <View style={styles.statusContainer}>
        {/* Battery Status */}
        <View style={[styles.statusCard, { borderLeftColor: getBatteryColor(stats.batteryLevel) }]}>
          <Text style={styles.statusIcon}>{getBatteryIcon(stats.batteryLevel)}</Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusNumber}>{stats.batteryLevel}%</Text>
            <Text style={styles.statusLabel}>Batarya Seviyesi</Text>
          </View>
        </View>

        {/* Location */}
        <View style={[styles.statusCard, { borderLeftColor: '#3B82F6' }]}>
          <Text style={styles.statusIcon}>📍</Text>
          <View style={styles.statusContent}>
            <Text style={styles.statusText}>{stats.currentLocation}</Text>
            <Text style={styles.statusLabel}>Mevcut Konum</Text>
          </View>
        </View>
      </View>

      {/* Task Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.todayCard]}>
          <Text style={styles.statNumber}>{stats.todayTasks}</Text>
          <Text style={styles.statLabel}>Bugün Toplam</Text>
        </View>

        <View style={[styles.statCard, styles.completedCard]}>
          <Text style={styles.statNumber}>{stats.completedTasks}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>

        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statNumber}>{stats.pendingTasks}</Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>

        <View style={[styles.statCard, styles.palletsCard]}>
          <Text style={styles.statNumber}>{stats.totalPallets}</Text>
          <Text style={styles.statLabel}>Toplam Palet</Text>
        </View>
      </View>

      {/* Task Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Görevler</Text>
        <View style={styles.actionsGrid}>
          {taskActions.map((task, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.taskCard, { borderLeftColor: task.color }]}
              onPress={() => handleTaskAction(task.action)}
            >
              <Text style={styles.taskIcon}>{task.icon}</Text>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={[styles.taskBadge, { backgroundColor: task.color }]}>
                {Math.floor(Math.random() * 10) + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Tasks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Görevler</Text>
        <View style={styles.taskList}>
          <View style={styles.taskItem}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>Mal Kabul - Palet 001</Text>
              <Text style={styles.taskLocation}>Depo A - Raf 12</Text>
            </View>
            <View style={styles.taskStatus}>
              <Text style={[styles.statusBadge, styles.completedBadge]}>Tamamlandı</Text>
              <Text style={styles.taskTime}>14:30</Text>
            </View>
          </View>

          <View style={styles.taskItem}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>Raf Düzenleme - Koridor 3</Text>
              <Text style={styles.taskLocation}>Depo B - Bölüm 5</Text>
            </View>
            <View style={styles.taskStatus}>
              <Text style={[styles.statusBadge, styles.inProgressBadge]}>Devam Ediyor</Text>
              <Text style={styles.taskTime}>16:45</Text>
            </View>
          </View>

          <View style={styles.taskItem}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>Sevkiyat Hazırlama</Text>
              <Text style={styles.taskLocation}>Yükleme Alanı 2</Text>
            </View>
            <View style={styles.taskStatus}>
              <Text style={[styles.statusBadge, styles.pendingBadge]}>Bekliyor</Text>
              <Text style={styles.taskTime}>17:15</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Alerts */}
      <View style={styles.alertsSection}>
        <Text style={styles.alertsTitle}>Sistem Uyarıları</Text>

        {stats.batteryLevel < 30 && (
          <View style={styles.alertItem}>
            <Text style={styles.alertIcon}>🪫</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Düşük Batarya</Text>
              <Text style={styles.alertText}>
                Batarya seviyeniz {stats.batteryLevel}%. Şarj istasyonuna gitmeniz önerilir.
              </Text>
            </View>
          </View>
        )}

        {stats.pendingTasks > 0 && (
          <View style={styles.alertItem}>
            <Text style={styles.alertIcon}>📋</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Bekleyen Görevler</Text>
              <Text style={styles.alertText}>
                {stats.pendingTasks} adet görev tamamlanmayı bekliyor.
              </Text>
            </View>
          </View>
        )}
      </View>
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
  statusContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusContent: {
    flex: 1,
  },
  statusNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CorporateTheme.colors.gray[900],
  },
  statusText: {
    fontSize: 14,
    color: CorporateTheme.colors.gray[900],
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 12,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[600],
    textAlign: 'center',
  },
  todayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  palletsCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
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
  taskCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CorporateTheme.colors.gray[900],
    textAlign: 'center',
    marginBottom: 8,
  },
  taskBadge: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  taskList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.gray[100],
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '500',
    color: CorporateTheme.colors.gray[900],
    marginBottom: 2,
  },
  taskLocation: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[500],
  },
  taskStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 2,
  },
  completedBadge: {
    backgroundColor: '#10B981',
    color: 'white',
  },
  inProgressBadge: {
    backgroundColor: '#3B82F6',
    color: 'white',
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    color: 'white',
  },
  taskTime: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[500],
  },
  alertsSection: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CorporateTheme.colors.gray[900],
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.gray[100],
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: CorporateTheme.colors.gray[900],
    marginBottom: 2,
  },
  alertText: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[600],
    lineHeight: 16,
  },
});

export default ForkliftHomeScreen;