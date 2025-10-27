import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Route {
  id: string;
  routeNumber: string;
  status: string;
  totalStops: number;
  completedStops: number;
  estimatedDuration: number;
  totalDistance: string;
  vehicleId: string;
  routeDate: string;
}

interface Stop {
  id: string;
  stopSequence: number;
  customerName: string;
  address: string;
  status: string;
  estimatedArrival: string;
  actualArrival?: string;
  podSignature?: string;
}

export default function TMSDriverScreen({ driverId }: { driverId: string }) {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [driverStats, setDriverStats] = useState<any>(null);

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    try {
      setLoading(true);
      // In production, these would be actual API calls
      const mockRoute: Route = {
        id: 'route-001',
        routeNumber: 'ROUTE-2025001',
        status: 'in_progress',
        totalStops: 8,
        completedStops: 3,
        estimatedDuration: 360,
        totalDistance: '245.5',
        vehicleId: 'vehicle-001',
        routeDate: new Date().toISOString(),
      };

      const mockStops: Stop[] = [
        {
          id: 'stop-001',
          stopSequence: 1,
          customerName: 'ABC Market',
          address: 'Atatürk Bulvarı No:123, Şişli, Istanbul',
          status: 'completed',
          estimatedArrival: '09:00',
          actualArrival: '08:55',
          podSignature: 'signed',
        },
        {
          id: 'stop-002',
          stopSequence: 2,
          customerName: 'XYZ Süpermarket',
          address: 'İstiklal Cad. No:45, Beyoğlu, Istanbul',
          status: 'completed',
          estimatedArrival: '10:30',
          actualArrival: '10:25',
          podSignature: 'signed',
        },
        {
          id: 'stop-003',
          stopSequence: 3,
          customerName: 'DEF Depo',
          address: 'Sanayi Mahallesi, Kağıthane, Istanbul',
          status: 'completed',
          estimatedArrival: '12:00',
          actualArrival: '11:58',
          podSignature: 'signed',
        },
        {
          id: 'stop-004',
          stopSequence: 4,
          customerName: 'GHI Lojistik',
          address: 'E-5 Karayolu Üzeri, Maltepe, Istanbul',
          status: 'in_transit',
          estimatedArrival: '14:00',
        },
        {
          id: 'stop-005',
          stopSequence: 5,
          customerName: 'JKL Pazarlama',
          address: 'Bağdat Cad. No:234, Kadıköy, Istanbul',
          status: 'pending',
          estimatedArrival: '15:30',
        },
      ];

      const mockStats = {
        totalRoutes: 245,
        completedRoutes: 228,
        onTimeRate: 94.2,
        avgRating: 4.7,
        totalDistance: 12500,
        safetyScore: 92,
      };

      setActiveRoute(mockRoute);
      setStops(mockStops);
      setDriverStats(mockStats);
    } catch (error) {
      console.error('Error loading driver data:', error);
      Alert.alert('Hata', 'Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDriverData();
  };

  const handleStartStop = (stop: Stop) => {
    Alert.alert(
      'Durağı Başlat',
      `${stop.customerName} durağına gidiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: () => {
            // Start navigation to stop
            console.log('Starting navigation to:', stop.address);
          },
        },
      ]
    );
  };

  const handleCompleteStop = (stop: Stop) => {
    // Navigate to POD signature screen
    console.log('Complete stop:', stop.id);
  };

  const getStopStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_transit':
        return '#3B82F6';
      case 'pending':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStopStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'in_transit':
        return 'truck-fast';
      case 'pending':
        return 'clock-outline';
      default:
        return 'help-circle-outline';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Driver Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Performans İstatistikleri</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Icon name="trophy" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{driverStats?.avgRating}</Text>
            <Text style={styles.statLabel}>Puan</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="clock-check" size={24} color="#10B981" />
            <Text style={styles.statValue}>{driverStats?.onTimeRate}%</Text>
            <Text style={styles.statLabel}>Zamanında</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="shield-check" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{driverStats?.safetyScore}</Text>
            <Text style={styles.statLabel}>Güvenlik</Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="map-marker-distance" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{driverStats?.totalDistance}km</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
        </View>
      </View>

      {/* Active Route Card */}
      {activeRoute && (
        <View style={styles.routeCard}>
          <View style={styles.routeHeader}>
            <Text style={styles.routeTitle}>{activeRoute.routeNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.statusText}>Aktif</Text>
            </View>
          </View>

          <View style={styles.routeInfo}>
            <View style={styles.infoRow}>
              <Icon name="map-marker-multiple" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                {activeRoute.completedStops}/{activeRoute.totalStops} Durak Tamamlandı
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="road-variant" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                {activeRoute.totalDistance} km
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="clock-outline" size={20} color="#6B7280" />
              <Text style={styles.infoText}>
                ~{Math.floor(activeRoute.estimatedDuration / 60)} saat
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(activeRoute.completedStops / activeRoute.totalStops) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              %{Math.round((activeRoute.completedStops / activeRoute.totalStops) * 100)} Tamamlandı
            </Text>
          </View>
        </View>
      )}

      {/* Stops List */}
      <View style={styles.stopsSection}>
        <Text style={styles.sectionTitle}>Duraklar</Text>
        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <View style={styles.stopNumberContainer}>
                <Icon
                  name={getStopStatusIcon(stop.status)}
                  size={24}
                  color={getStopStatusColor(stop.status)}
                />
                <Text style={styles.stopNumber}>{stop.stopSequence}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopCustomer}>{stop.customerName}</Text>
                <Text style={styles.stopAddress}>{stop.address}</Text>
                <View style={styles.stopTime}>
                  <Icon name="clock-outline" size={14} color="#6B7280" />
                  <Text style={styles.stopTimeText}>
                    Tahmini: {stop.estimatedArrival}
                    {stop.actualArrival && ` | Gerçek: ${stop.actualArrival}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stop Actions */}
            {stop.status === 'in_transit' && (
              <View style={styles.stopActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => handleCompleteStop(stop)}
                >
                  <Icon name="check" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Teslim Et</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryButton]}
                  onPress={() => Alert.alert('İletişim', `${stop.customerName} ile iletişim`)}
                >
                  <Icon name="phone" size={18} color="#3B82F6" />
                  <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                    Ara
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {stop.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.outlineButton]}
                onPress={() => handleStartStop(stop)}
              >
                <Icon name="navigation" size={18} color="#3B82F6" />
                <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>
                  Yola Çık
                </Text>
              </TouchableOpacity>
            )}

            {stop.status === 'completed' && stop.podSignature && (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.completedText}>Teslim Edildi</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickActionButton}>
          <Icon name="phone" size={24} color="#3B82F6" />
          <Text style={styles.quickActionText}>Destek</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Icon name="alert-circle" size={24} color="#EF4444" />
          <Text style={styles.quickActionText}>Sorun Bildir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Icon name="gas-station" size={24} color="#F59E0B" />
          <Text style={styles.quickActionText}>Yakıt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickActionButton}>
          <Icon name="home" size={24} color="#8B5CF6" />
          <Text style={styles.quickActionText}>Depoya Dön</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statsCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  routeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  stopsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  stopCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stopHeader: {
    flexDirection: 'row',
  },
  stopNumberContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  stopInfo: {
    flex: 1,
  },
  stopCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stopAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  stopTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopTimeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  stopActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 8,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
});

