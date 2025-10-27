import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { UsersIcon, CalendarIcon, ChartBarIcon } from 'react-native-heroicons/solid';

export default function HRHomeScreen() {
  const { user } = useAuth();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Back</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.role}>HR Manager</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <UsersIcon color="#8b5cf6" size={32} />
          <Text style={styles.statValue}>152</Text>
          <Text style={styles.statLabel}>Total Employees</Text>
        </View>
        <View style={styles.statCard}>
          <CalendarIcon color="#f59e0b" size={32} />
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>On Leave Today</Text>
        </View>
        <View style={styles.statCard}>
          <ChartBarIcon color="#10b981" size={32} />
          <Text style={styles.statValue}>95%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryItem}>✅ 142 employees checked in</Text>
          <Text style={styles.summaryItem}>🏖️ 8 employees on leave</Text>
          <Text style={styles.summaryItem}>🤒 2 employees on sick leave</Text>
          <Text style={styles.summaryItem}>📝 5 pending leave requests</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#8b5cf6', padding: 24, paddingTop: 60 },
  greeting: { fontSize: 16, color: '#ffffff', opacity: 0.9 },
  name: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginTop: 4 },
  role: { fontSize: 14, color: '#ffffff', opacity: 0.8, marginTop: 4 },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  summaryCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 12 },
  summaryItem: { fontSize: 14, color: '#374151' },
});


