import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MapPinIcon, ClockIcon, CheckCircleIcon } from 'react-native-heroicons/solid';
import MapView, { Marker, Polyline } from 'react-native-maps';

export default function RoutesScreen() {
  const [route] = useState({
    id: 'route-001',
    origin: { lat: 41.0082, lng: 28.9784, name: 'Istanbul Warehouse' },
    destination: { lat: 39.9334, lng: 32.8597, name: 'Ankara Distribution Center' },
    stops: [
      { id: 's1', lat: 40.7654, lng: 30.3889, name: 'Izmit Stop', status: 'completed', eta: '09:30' },
      { id: 's2', lat: 40.6536, lng: 31.1656, name: 'Bolu Stop', status: 'completed', eta: '12:00' },
      { id: 's3', lat: 40.2671, lng: 31.8826, name: 'Gerede Stop', status: 'in_progress', eta: '14:30' },
      { id: 's4', lat: 40.1553, lng: 32.5211, name: 'Beypazari Stop', status: 'pending', eta: '16:00' },
      { id: 's5', lat: 39.9334, lng: 32.8597, name: 'Ankara Final', status: 'pending', eta: '17:30' },
    ],
  });

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 40.5,
          longitude: 30.5,
          latitudeDelta: 3,
          longitudeDelta: 3,
        }}
      >
        <Marker coordinate={{ latitude: route.origin.lat, longitude: route.origin.lng }} pinColor="green" />
        <Marker coordinate={{ latitude: route.destination.lat, longitude: route.destination.lng }} pinColor="red" />
        {route.stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            pinColor={stop.status === 'completed' ? 'blue' : stop.status === 'in_progress' ? 'orange' : 'gray'}
          />
        ))}
        <Polyline
          coordinates={[
            { latitude: route.origin.lat, longitude: route.origin.lng },
            ...route.stops.map(s => ({ latitude: s.lat, longitude: s.lng })),
          ]}
          strokeColor="#3b82f6"
          strokeWidth={3}
        />
      </MapView>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Route Details</Text>
        <ScrollView>
          {route.stops.map((stop, index) => (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{stop.name}</Text>
                  <Text style={styles.stopEta}>ETA: {stop.eta}</Text>
                </View>
                {stop.status === 'completed' && <CheckCircleIcon color="#10b981" size={24} />}
                {stop.status === 'in_progress' && <ClockIcon color="#f59e0b" size={24} />}
              </View>
              {stop.status === 'in_progress' && (
                <TouchableOpacity style={styles.completeButton}>
                  <Text style={styles.completeButtonText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: 400 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  stopCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 12 },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  stopNumberText: { color: '#ffffff', fontWeight: 'bold' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: '600' },
  stopEta: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  completeButton: { backgroundColor: '#10b981', borderRadius: 8, padding: 12, marginTop: 12 },
  completeButtonText: { color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
});

