import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  MagnifyingGlassIcon,
  TruckIcon,
  ClockIcon,
  MapPinIcon,
  BellIcon,
  UserIcon,
} from 'react-native-heroicons/outline';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Shipment {
  id: string;
  trackingNumber: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  origin: string;
  destination: string;
  estimatedDelivery: string;
  createdAt: string;
}

const HomeScreen: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      // TODO: Replace with actual API call
      const mockShipments: Shipment[] = [
        {
          id: '1',
          trackingNumber: 'AYAZ2025001',
          status: 'in_transit',
          origin: 'İstanbul',
          destination: 'Ankara',
          estimatedDelivery: '2025-10-28',
          createdAt: '2025-10-26',
        },
        {
          id: '2',
          trackingNumber: 'AYAZ2025002',
          status: 'delivered',
          origin: 'İzmir',
          destination: 'Bursa',
          estimatedDelivery: '2025-10-25',
          createdAt: '2025-10-24',
        },
      ];
      setShipments(mockShipments);
    } catch (error) {
      Alert.alert('Hata', 'Kargolar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShipments();
    setRefreshing(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'in_transit': return 'Yolda';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_transit': return '#3b82f6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleTrackShipment = () => {
    if (!searchText.trim()) {
      Alert.alert('Hata', 'Lütfen takip numarası girin');
      return;
    }
    // TODO: Navigate to tracking screen with search text
    Alert.alert('Bilgi', `Kargo takip numarası: ${searchText}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Hoş Geldiniz!</Text>
          <Text style={styles.subtitleText}>Kargolarınızı takip edin</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MagnifyingGlassIcon color="#9ca3af" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kargo takip numarası girin"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleTrackShipment}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleTrackShipment}>
            <Text style={styles.searchButtonText}>Takip Et</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.quickAction}>
            <TruckIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Yeni Kargo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <ClockIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Geçmiş</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <BellIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Bildirimler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <UserIcon color="#3b82f6" size={24} />
            <Text style={styles.quickActionText}>Profil</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Shipments */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Son Kargolar</Text>
          {shipments.map((shipment) => (
            <TouchableOpacity key={shipment.id} style={styles.shipmentCard}>
              <View style={styles.shipmentHeader}>
                <Text style={styles.trackingNumber}>{shipment.trackingNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(shipment.status)}</Text>
                </View>
              </View>
              <View style={styles.shipmentDetails}>
                <View style={styles.routeContainer}>
                  <MapPinIcon color="#6b7280" size={16} />
                  <Text style={styles.routeText}>{shipment.origin} → {shipment.destination}</Text>
                </View>
                <Text style={styles.deliveryText}>Tahmini Teslimat: {shipment.estimatedDelivery}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 16,
    color: '#6b7280',
  },
  searchContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  quickAction: {
    width: '50%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
  },
  quickActionText: {
    fontSize: 14,
    color: '#1f2937',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    padding: 20,
    paddingBottom: 10,
  },
  shipmentCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  shipmentDetails: {
    gap: 8,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  deliveryText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default HomeScreen;
