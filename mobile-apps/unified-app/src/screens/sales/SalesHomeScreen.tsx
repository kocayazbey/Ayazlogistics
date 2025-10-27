import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ShoppingCartIcon, CurrencyDollarIcon, UsersIcon } from 'react-native-heroicons/solid';

export default function SalesHomeScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Back</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Sales Representative</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <ShoppingCartIcon color="#ec4899" size={32} />
          <Text style={styles.statValue}>₺3.2M</Text>
          <Text style={styles.statLabel}>Monthly Sales</Text>
        </View>
        <View style={styles.statCard}>
          <CurrencyDollarIcon color="#10b981" size={32} />
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Deals Closed</Text>
        </View>
        <View style={styles.statCard}>
          <UsersIcon color="#3b82f6" size={32} />
          <Text style={styles.statValue}>45</Text>
          <Text style={styles.statLabel}>Active Leads</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>This Week's Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryItem}>🎯 18 deals closed (₺3.2M)</Text>
          <Text style={styles.summaryItem}>📞 25 calls made</Text>
          <Text style={styles.summaryItem}>📧 40 emails sent</Text>
          <Text style={styles.summaryItem}>🤝 12 meetings scheduled</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#ec4899', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 16, color: '#ffffff', opacity: 0.9 },
  name: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  role: { fontSize: 14, color: '#ffffff', opacity: 0.8, marginTop: 4 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  summaryCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 12 },
  summaryItem: { fontSize: 14, color: '#374151' },
});

