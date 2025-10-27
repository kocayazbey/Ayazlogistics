import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  MagnifyingGlassIcon,
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
} from 'react-native-heroicons/outline';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TrackingStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
}

interface TrackingInfo {
  trackingNumber: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  origin: string;
  destination: string;
  currentLocation?: string;
  estimatedDelivery: string;
  steps: TrackingStep[];
}

const TrackingScreen: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!trackingNumber.trim()) {
      Alert.alert('Hata', 'Lütfen takip numarası girin');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      const mockTrackingInfo: TrackingInfo = {
        trackingNumber: trackingNumber,
        status: 'in_transit',
        origin: 'İstanbul',
        destination: 'Ankara',
        currentLocation: 'Bolu',
        estimatedDelivery: '2025-10-28',
        steps: [
          {
            id: '1',
            title: 'Kargo Alındı',
            description: 'Kargo göndericiden teslim alındı',
            timestamp: '2025-10-26 09:30',
            completed: true,
          },
          {
            id: '2',
            title: 'Sıralama Merkezi',
            description: 'Kargo sıralama merkezine ulaştı',
            timestamp: '2025-10-26 14:20',
            completed: true,
          },
          {
            id: '3',
            title: 'Yolda',
            description: 'Kargo varış şehrine doğru yolda',
            timestamp: '2025-10-27 08:15',
            completed: true,
          },
          {
            id: '4',
            title: 'Dağıtım',
            description: 'Kargo dağıtım için hazır',
            completed: false,
          },
          {
            id: '5',
            title: 'Teslimat',
            description: 'Kargo alıcıya teslim edildi',
            completed: false,
          },
        ],
      };

      setTrackingInfo(mockTrackingInfo);
    } catch (error) {
      Alert.alert('Hata', 'Kargo bilgileri alınırken bir hata oluştu');
    } finally {
      setLoading(false);
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'in_transit': return 'Yolda';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Kargo Takibi</Text>
          <Text style={styles.subtitle}>Gerçek zamanlı kargo durumunu takip edin</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MagnifyingGlassIcon color="#9ca3af" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Kargo takip numarası girin"
              value={trackingNumber}
              onChangeText={setTrackingNumber}
              onSubmitEditing={handleTrack}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={[styles.searchButton, loading && styles.searchButtonDisabled]}
            onPress={handleTrack}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Takip Et</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tracking Results */}
        {trackingInfo && (
          <View style={styles.trackingContainer}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <Text style={styles.trackingNumber}>{trackingInfo.trackingNumber}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trackingInfo.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(trackingInfo.status)}</Text>
                </View>
              </View>

              <View style={styles.routeInfo}>
                <View style={styles.routePoint}>
                  <MapPinIcon color="#10b981" size={20} />
                  <View style={styles.routeDetails}>
                    <Text style={styles.routeLabel}>Gönderici:</Text>
                    <Text style={styles.routeValue}>{trackingInfo.origin}</Text>
                  </View>
                </View>

                <View style={styles.routeLine} />

                <View style={styles.routePoint}>
                  <MapPinIcon color="#ef4444" size={20} />
                  <View style={styles.routeDetails}>
                    <Text style={styles.routeLabel}>Alıcı:</Text>
                    <Text style={styles.routeValue}>{trackingInfo.destination}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.deliveryInfo}>
                <ClockIcon color="#6b7280" size={16} />
                <Text style={styles.deliveryText}>
                  Tahmini Teslimat: {trackingInfo.estimatedDelivery}
                </Text>
              </View>
            </View>

            {/* Tracking Steps */}
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>Takip Geçmişi</Text>
              {trackingInfo.steps.map((step, index) => (
                <View key={step.id} style={styles.stepContainer}>
                  <View style={styles.stepIndicator}>
                    {step.completed ? (
                      <CheckCircleIcon color="#10b981" size={24} />
                    ) : (
                      <View style={styles.stepCircle} />
                    )}
                    {index < trackingInfo.steps.length - 1 && (
                      <View style={[styles.stepLine, step.completed && styles.stepLineCompleted]} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                    {step.timestamp && (
                      <Text style={styles.stepTimestamp}>{step.timestamp}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
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
  searchButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackingContainer: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  statusCard: {
    margin: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackingNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeInfo: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeDetails: {
    marginLeft: 12,
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  routeValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginLeft: 9,
    marginBottom: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  stepsContainer: {
    margin: 20,
    marginTop: 0,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  stepLine: {
    width: 2,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  stepTimestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

export default TrackingScreen;
