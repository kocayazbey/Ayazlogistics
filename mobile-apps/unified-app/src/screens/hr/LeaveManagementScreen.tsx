import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from 'react-native-heroicons/solid';

export default function LeaveManagementScreen() {
  const [requests] = useState([
    { id: '1', employee: 'Mehmet Kaya', type: 'Annual Leave', from: '2024-10-25', to: '2024-10-27', days: 3, status: 'pending' },
    { id: '2', employee: 'Ayşe Demir', type: 'Sick Leave', from: '2024-10-24', to: '2024-10-24', days: 1, status: 'approved' },
    { id: '3', employee: 'Can Yıldız', type: 'Annual Leave', from: '2024-11-01', to: '2024-11-05', days: 5, status: 'pending' },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leave Management</Text>
        <Text style={styles.subtitle}>3 requests • 2 pending</Text>
      </View>

      <View style={styles.requestsSection}>
        {requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.requestLeft}>
                <Text style={styles.employeeName}>{request.employee}</Text>
                <Text style={styles.leaveType}>{request.type}</Text>
              </View>
              {request.status === 'approved' && <CheckCircleIcon color="#10b981" size={24} />}
              {request.status === 'pending' && <ClockIcon color="#f59e0b" size={24} />}
            </View>

            <View style={styles.requestDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>From:</Text>
                <Text style={styles.detailValue}>{request.from}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>To:</Text>
                <Text style={styles.detailValue}>{request.to}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>{request.days} day(s)</Text>
              </View>
            </View>

            {request.status === 'pending' && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.approveButton}>
                  <CheckCircleIcon color="#ffffff" size={18} />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton}>
                  <XCircleIcon color="#ef4444" size={18} />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#8b5cf6', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  requestsSection: { padding: 16 },
  requestCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12 },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  requestLeft: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: 'bold' },
  leaveType: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  requestDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  approveButton: { flex: 1, backgroundColor: '#10b981', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  approveButtonText: { color: '#ffffff', fontWeight: 'bold' },
  rejectButton: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#fecaca' },
  rejectButtonText: { color: '#ef4444', fontWeight: 'bold' },
});

