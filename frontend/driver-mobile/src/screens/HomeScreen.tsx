import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  const stats = {
    todayDeliveries: 12,
    completed: 8,
    pending: 4,
    distance: 145,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Morning, Driver!</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('tr-TR')}</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard label="Today's Deliveries" value={stats.todayDeliveries} color="#007AFF" />
        <StatCard label="Completed" value={stats.completed} color="#34C759" />
        <StatCard label="Pending" value={stats.pending} color="#FF9500" />
        <StatCard label="Distance (km)" value={stats.distance} color="#5856D6" />
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Deliveries')}
      >
        <Text style={styles.actionButtonText}>View Deliveries</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Map')}
      >
        <Text style={styles.actionButtonText}>Open Map</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  date: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

