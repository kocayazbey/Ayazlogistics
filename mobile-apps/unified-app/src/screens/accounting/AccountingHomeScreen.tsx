import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { CurrencyDollarIcon, DocumentTextIcon, ChartBarIcon } from 'react-native-heroicons/solid';

export default function AccountingHomeScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Back</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>Accountant</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <CurrencyDollarIcon color="#f59e0b" size={32} />
          <Text style={styles.statValue}>₺2.4M</Text>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
        </View>
        <View style={styles.statCard}>
          <DocumentTextIcon color="#ef4444" size={32} />
          <Text style={styles.statValue}>45</Text>
          <Text style={styles.statLabel}>Pending Invoices</Text>
        </View>
        <View style={styles.statCard}>
          <ChartBarIcon color="#10b981" size={32} />
          <Text style={styles.statValue}>₺850K</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionTitle}>📄 Invoices</Text>
          <Text style={styles.actionSubtitle}>View and manage invoices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionTitle}>💳 Payments</Text>
          <Text style={styles.actionSubtitle}>Process payments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Text style={styles.actionTitle}>📊 Reports</Text>
          <Text style={styles.actionSubtitle}>Financial reports</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#f59e0b', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 16, color: '#ffffff', opacity: 0.9 },
  name: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  role: { fontSize: 14, color: '#ffffff', opacity: 0.8, marginTop: 4 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  actionCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12 },
  actionTitle: { fontSize: 16, fontWeight: 'bold' },
  actionSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
});

