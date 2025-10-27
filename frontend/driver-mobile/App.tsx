import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';

const App = () => {
  const [screen, setScreen] = useState('home');

  return (
    <View style={styles.container}>
      {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
      {screen === 'deliveries' && <DeliveriesScreen onBack={() => setScreen('home')} />}
      {screen === 'route' && <RouteScreen onBack={() => setScreen('home')} />}
      {screen === 'profile' && <ProfileScreen onBack={() => setScreen('home')} />}
    </View>
  );
};

const HomeScreen = ({ onNavigate }: any) => {
  return (
    <View style={styles.homeContainer}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba, Ahmet</Text>
          <Text style={styles.subGreeting}>Good Morning!</Text>
        </View>
        <TouchableOpacity onPress={() => onNavigate('profile')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AY</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Today's Deliveries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('deliveries')}>
          <Text style={styles.menuIcon}>📦</Text>
          <Text style={styles.menuLabel}>My Deliveries</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('route')}>
          <Text style={styles.menuIcon}>🗺️</Text>
          <Text style={styles.menuLabel}>Route Map</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard}>
          <Text style={styles.menuIcon}>📷</Text>
          <Text style={styles.menuLabel}>Scan POD</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard}>
          <Text style={styles.menuIcon}>⏱️</Text>
          <Text style={styles.menuLabel}>Timesheet</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.currentDelivery}>
        <Text style={styles.sectionTitle}>Current Delivery</Text>
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryHeader}>
            <Text style={styles.deliveryNumber}>#DEL-2025-001</Text>
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          </View>
          <Text style={styles.deliveryCustomer}>Acme Corporation</Text>
          <Text style={styles.deliveryAddress}>📍 Ankara, Çankaya - 15.2 km away</Text>
          <Text style={styles.deliveryETA}>ETA: 14:30 (25 min)</Text>
          <TouchableOpacity style={styles.navigateButton}>
            <Text style={styles.navigateButtonText}>🧭 Start Navigation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const DeliveriesScreen = ({ onBack }: any) => {
  const deliveries = [
    { id: '1', number: 'DEL-001', customer: 'Acme Corp', address: 'Ankara', status: 'in_transit', eta: '14:30' },
    { id: '2', number: 'DEL-002', customer: 'TechStore', address: 'Ankara', status: 'pending', eta: '15:45' },
    { id: '3', number: 'DEL-003', customer: 'Global Ltd', address: 'Ankara', status: 'completed', eta: 'Delivered' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Deliveries</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.deliveriesList}>
        {deliveries.map(delivery => (
          <View key={delivery.id} style={styles.deliveryListItem}>
            <View style={styles.deliveryListHeader}>
              <Text style={styles.deliveryListNumber}>{delivery.number}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: delivery.status === 'completed' ? '#10b981' : delivery.status === 'in_transit' ? '#3b82f6' : '#f59e0b' }
              ]}>
                <Text style={styles.statusText}>{delivery.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.deliveryListCustomer}>{delivery.customer}</Text>
            <Text style={styles.deliveryListAddress}>📍 {delivery.address}</Text>
            <Text style={styles.deliveryListETA}>ETA: {delivery.eta}</Text>
            
            {delivery.status !== 'completed' && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const RouteScreen = ({ onBack }: any) => {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Route Map</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapText}>🗺️</Text>
        <Text style={styles.mapLabel}>Interactive Route Map</Text>
        <Text style={styles.mapSubLabel}>Google Maps Integration</Text>
      </View>

      <View style={styles.routeInfo}>
        <View style={styles.routeInfoItem}>
          <Text style={styles.routeInfoLabel}>Total Distance</Text>
          <Text style={styles.routeInfoValue}>45.3 km</Text>
        </View>
        <View style={styles.routeInfoItem}>
          <Text style={styles.routeInfoLabel}>Estimated Time</Text>
          <Text style={styles.routeInfoValue}>2h 15m</Text>
        </View>
        <View style={styles.routeInfoItem}>
          <Text style={styles.routeInfoLabel}>Stops</Text>
          <Text style={styles.routeInfoValue}>8</Text>
        </View>
      </View>
    </View>
  );
};

const ProfileScreen = ({ onBack }: any) => {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>AY</Text>
        </View>
        <Text style={styles.profileName}>Ahmet Yılmaz</Text>
        <Text style={styles.profileRole}>Professional Driver</Text>
      </View>

      <View style={styles.profileStats}>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatValue}>1,234</Text>
          <Text style={styles.profileStatLabel}>Total Deliveries</Text>
        </View>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatValue}>98%</Text>
          <Text style={styles.profileStatLabel}>On-Time Rate</Text>
        </View>
        <View style={styles.profileStatItem}>
          <Text style={styles.profileStatValue}>4.9</Text>
          <Text style={styles.profileStatLabel}>Rating</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  homeContainer: { flex: 1 },
  header: { backgroundColor: 'white', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  subGreeting: { fontSize: 14, color: '#666', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  menuGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: { width: '48%', backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  menuIcon: { fontSize: 40, marginBottom: 8 },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
  currentDelivery: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  deliveryCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  deliveryNumber: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  urgentBadge: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  urgentText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  deliveryCustomer: { fontSize: 18, fontWeight: '600', color: '#111', marginBottom: 8 },
  deliveryAddress: { fontSize: 14, color: '#666', marginBottom: 4 },
  deliveryETA: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginBottom: 16 },
  navigateButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  navigateButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  screenHeader: { backgroundColor: 'white', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { fontSize: 16, color: '#007AFF' },
  screenTitle: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  deliveriesList: { flex: 1, padding: 16 },
  deliveryListItem: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  deliveryListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  deliveryListNumber: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  deliveryListCustomer: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 4 },
  deliveryListAddress: { fontSize: 14, color: '#666', marginBottom: 4 },
  deliveryListETA: { fontSize: 14, color: '#007AFF', fontWeight: '600', marginBottom: 12 },
  actionButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  mapPlaceholder: { flex: 1, backgroundColor: '#e5e7eb', margin: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mapText: { fontSize: 64 },
  mapLabel: { fontSize: 18, fontWeight: 'bold', color: '#111', marginTop: 16 },
  mapSubLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  routeInfo: { flexDirection: 'row', padding: 16, gap: 12 },
  routeInfoItem: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  routeInfoLabel: { fontSize: 12, color: '#666' },
  routeInfoValue: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', marginTop: 4 },
  profileHeader: { backgroundColor: 'white', padding: 32, alignItems: 'center' },
  profileAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  profileAvatarText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  profileRole: { fontSize: 16, color: '#666', marginTop: 4 },
  profileStats: { flexDirection: 'row', padding: 16, gap: 12 },
  profileStatItem: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center' },
  profileStatValue: { fontSize: 28, fontWeight: 'bold', color: '#007AFF' },
  profileStatLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
});

export default App;
