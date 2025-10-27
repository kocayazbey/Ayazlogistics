import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { CheckCircleIcon, ClockIcon, TruckIcon, MapPinIcon, BellIcon } from 'react-native-heroicons/solid';
import { MapPinIcon as MapPinOutline, ExclamationTriangleIcon } from 'react-native-heroicons/outline';

export default function HomeScreen() {
  const [stats, setStats] = useState({
    todayTrips: 5,
    completed: 3,
    pending: 2,
    totalDistance: 245,
    rating: 4.8,
    earnings: 1250,
  });

  const [currentTask, setCurrentTask] = useState({
    id: '1',
    type: 'pickup',
    address: 'Maslak, İstanbul',
    customer: 'ABC Lojistik A.Ş.',
    time: '14:30',
    status: 'active',
  });

  const handleStartNavigation = () => {
    Alert.alert(
      'Navigasyon',
      'Harita uygulamasına yönlendiriliyorsunuz...',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Başlat', onPress: () => {
          // TODO: Open map navigation
          Alert.alert('Bilgi', 'Google Maps veya Yandex Navigasyon açılacak');
        }},
      ]
    );
  };

  const handleAcceptTask = () => {
    Alert.alert(
      'Görev Kabul',
      'Bu görevi kabul etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Kabul Et', onPress: () => {
          setCurrentTask(prev => ({ ...prev, status: 'accepted' }));
          Alert.alert('Başarılı', 'Görev kabul edildi');
        }},
      ]
    );
  };

  const handleCompleteTask = () => {
    Alert.alert(
      'Görev Tamamla',
      'Bu görevi tamamladığınızdan emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Tamamla', onPress: () => {
          setStats(prev => ({ ...prev, completed: prev.completed + 1, pending: prev.pending - 1 }));
          Alert.alert('Başarılı', 'Görev tamamlandı');
        }},
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Günaydın</Text>
        <Text style={styles.driverName}>Mehmet Yılmaz</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingText}>⭐ {stats.rating}</Text>
          <Text style={styles.earningsText}>₺{stats.earnings} / gün</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TruckIcon color="#3b82f6" size={32} />
          <Text style={styles.statValue}>{stats.todayTrips}</Text>
          <Text style={styles.statLabel}>Bugünkü Sefer</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircleIcon color="#10b981" size={32} />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Tamamlanan</Text>
        </View>
        <View style={styles.statCard}>
          <ClockIcon color="#f59e0b" size={32} />
          <Text style={styles.statValue}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Bekleyen</Text>
        </View>
      </View>

      {/* Current Task */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktif Görev</Text>
        <View style={styles.taskCard}>
          <View style={styles.taskHeader}>
            <View style={styles.taskType}>
              <Text style={styles.taskTypeText}>
                {currentTask.type === 'pickup' ? '🚚 Teslim Alma' : '📦 Teslimat'}
              </Text>
            </View>
            <Text style={styles.taskTime}>{currentTask.time}</Text>
          </View>

          <View style={styles.taskDetails}>
            <MapPinIcon color="#3b82f6" size={20} />
            <View style={styles.taskInfo}>
              <Text style={styles.taskAddress}>{currentTask.address}</Text>
              <Text style={styles.taskCustomer}>{currentTask.customer}</Text>
            </View>
          </View>

          <View style={styles.taskActions}>
            {currentTask.status === 'active' && (
              <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptTask}>
                <Text style={styles.acceptButtonText}>Kabul Et</Text>
              </TouchableOpacity>
            )}
            {currentTask.status === 'accepted' && (
              <>
                <TouchableOpacity style={styles.navigateButton} onPress={handleStartNavigation}>
                  <Text style={styles.navigateButtonText}>Navigasyon</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.completeButton} onPress={handleCompleteTask}>
                  <Text style={styles.completeButtonText}>Tamamla</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Active Route */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktif Rota</Text>
        <View style={styles.routeCard}>
          <Text style={styles.routeTitle}>İstanbul → Ankara</Text>
          <Text style={styles.routeSubtitle}>5 durak • 425 km</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <Text style={styles.progressText}>3/5 durak tamamlandı (%60)</Text>
          <TouchableOpacity style={styles.navigateButton} onPress={handleStartNavigation}>
            <Text style={styles.navigateButtonText}>Rotayı Görüntüle</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickAction}>
            <BellIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Bildirimler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <MapPinOutline color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Konum</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <ExclamationTriangleIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Acil Durum</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <TruckIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Araç</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#3b82f6', paddingTop: 60 },
  greeting: { fontSize: 16, color: '#ffffff', opacity: 0.9 },
  driverName: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  ratingContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ratingText: { fontSize: 16, color: '#ffffff', fontWeight: '600' },
  earningsText: { fontSize: 16, color: '#ffffff', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8, color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1f2937' },

  // Task Card Styles
  taskCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  taskType: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  taskTypeText: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
  taskTime: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  taskDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  taskInfo: { marginLeft: 12, flex: 1 },
  taskAddress: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  taskCustomer: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  taskActions: { flexDirection: 'row', gap: 12 },
  acceptButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, flex: 1, alignItems: 'center' },
  acceptButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  navigateButton: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, flex: 1, alignItems: 'center' },
  navigateButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },
  completeButton: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, flex: 1, alignItems: 'center' },
  completeButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16 },

  // Route Card Styles
  routeCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  routeTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  routeSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginTop: 16 },
  progressFill: { height: 8, backgroundColor: '#3b82f6', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#6b7280', marginTop: 8 },

  // Quick Actions Grid
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: { width: '48%', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  quickActionText: { fontSize: 14, color: '#1f2937', marginTop: 8, textAlign: 'center' },
});

