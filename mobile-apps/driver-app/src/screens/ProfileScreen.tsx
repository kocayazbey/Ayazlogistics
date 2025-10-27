import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { UserIcon, TruckIcon, ChartBarIcon, CogIcon, ArrowRightOnRectangleIcon } from 'react-native-heroicons/outline';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: 'https://i.pravatar.cc/150?img=12' }} style={styles.avatar} />
        </View>
        <Text style={styles.name}>Mehmet Yılmaz</Text>
        <Text style={styles.role}>Professional Driver • ID: DR-2024-001</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>247</Text>
          <Text style={styles.statLabel}>Total Trips</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>98.5%</Text>
          <Text style={styles.statLabel}>On-Time Rate</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>4.9</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <UserIcon color="#6b7280" size={24} />
          <Text style={styles.menuText}>Personal Information</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <TruckIcon color="#6b7280" size={24} />
          <Text style={styles.menuText}>Vehicle Information</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <ChartBarIcon color="#6b7280" size={24} />
          <Text style={styles.menuText}>Performance Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <CogIcon color="#6b7280" size={24} />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <ArrowRightOnRectangleIcon color="#ef4444" size={24} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#3b82f6', paddingTop: 60, paddingBottom: 30, alignItems: 'center' },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ffffff', padding: 4 },
  avatar: { width: 92, height: 92, borderRadius: 46 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginTop: 12 },
  role: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  statsContainer: { flexDirection: 'row', padding: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  menuSection: { backgroundColor: '#ffffff', marginHorizontal: 16, borderRadius: 12, marginTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuText: { fontSize: 16, color: '#1f2937' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffffff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
});

