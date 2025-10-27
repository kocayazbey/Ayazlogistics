import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ClockIcon, CheckCircleIcon } from 'react-native-heroicons/solid';

export default function IncomingOrdersScreen() {
  const [orders] = useState([
    { id: 'ORD-001', customer: 'ABC Ltd.', pallets: 15, location: 'Dock 1', status: 'pending', eta: '15:30' },
    { id: 'ORD-002', customer: 'XYZ Corp', pallets: 8, location: 'Dock 2', status: 'in_progress', eta: '15:45' },
    { id: 'ORD-003', customer: 'DEF Inc.', pallets: 20, location: 'Dock 3', status: 'pending', eta: '16:00' },
    { id: 'ORD-004', customer: 'GHI Co.', pallets: 12, location: 'Dock 1', status: 'pending', eta: '16:30' },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Incoming Orders</Text>
        <Text style={styles.subtitle}>{orders.length} orders today</Text>
      </View>

      <View style={styles.ordersSection}>
        {orders.map((order) => (
          <View key={order.id} style={[styles.orderCard, order.status === 'in_progress' && styles.activeCard]}>
            <View style={styles.orderHeader}>
              <View style={styles.orderLeft}>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.customer}>{order.customer}</Text>
              </View>
              {order.status === 'in_progress' ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>In Progress</Text>
                </View>
              ) : (
                <ClockIcon color="#f59e0b" size={24} />
              )}
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📦 Pallets:</Text>
                <Text style={styles.detailValue}>{order.pallets}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📍 Location:</Text>
                <Text style={styles.detailValue}>{order.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🕐 ETA:</Text>
                <Text style={styles.detailValue}>{order.eta}</Text>
              </View>
            </View>

            {order.status === 'pending' && (
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Processing</Text>
              </TouchableOpacity>
            )}

            {order.status === 'in_progress' && (
              <TouchableOpacity style={styles.completeButton}>
                <CheckCircleIcon color="#ffffff" size={20} />
                <Text style={styles.completeButtonText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#3b82f6', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  ordersSection: { padding: 16 },
  orderCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  activeCard: { borderLeftColor: '#10b981' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderLeft: { flex: 1 },
  orderId: { fontSize: 18, fontWeight: 'bold' },
  customer: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  badge: { backgroundColor: '#10b981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  orderDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  startButton: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 14 },
  startButtonText: { color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
  completeButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  completeButtonText: { color: '#ffffff', fontWeight: 'bold' },
});

