import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TruckIcon, CheckCircleIcon, ClockIcon } from 'react-native-heroicons/solid';

export default function ShipmentScreen() {
  const [shipments] = useState([
    { id: 'SHP-001', customer: 'ABC Ltd.', items: 25, status: 'ready', priority: 'high' },
    { id: 'SHP-002', customer: 'XYZ Corp', items: 15, status: 'picking', priority: 'normal' },
    { id: 'SHP-003', customer: 'DEF Inc.', items: 40, status: 'ready', priority: 'urgent' },
  ]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shipments</Text>
        <Text style={styles.subtitle}>{shipments.length} shipments pending</Text>
      </View>

      <View style={styles.shipmentsSection}>
        {shipments.map((shipment) => (
          <View key={shipment.id} style={styles.shipmentCard}>
            <View style={styles.shipmentHeader}>
              <View style={styles.shipmentLeft}>
                <Text style={styles.shipmentId}>{shipment.id}</Text>
                <Text style={styles.customer}>{shipment.customer}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(shipment.priority) }]}>
                <Text style={styles.priorityText}>{shipment.priority.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.shipmentDetails}>
              <Text style={styles.detailText}>📦 {shipment.items} items</Text>
              <Text style={styles.detailText}>
                {shipment.status === 'ready' ? '✅ Ready to ship' : '🔄 Picking in progress'}
              </Text>
            </View>

            {shipment.status === 'ready' && (
              <TouchableOpacity style={styles.shipButton}>
                <TruckIcon color="#ffffff" size={20} />
                <Text style={styles.shipButtonText}>Process Shipment</Text>
              </TouchableOpacity>
            )}

            {shipment.status === 'picking' && (
              <View style={styles.pickingBadge}>
                <ClockIcon color="#f59e0b" size={16} />
                <Text style={styles.pickingText}>Picking in progress...</Text>
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
  header: { backgroundColor: '#10b981', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  shipmentsSection: { padding: 16 },
  shipmentCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12 },
  shipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  shipmentLeft: { flex: 1 },
  shipmentId: { fontSize: 18, fontWeight: 'bold' },
  customer: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  priorityText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  shipmentDetails: { gap: 6, marginBottom: 12 },
  detailText: { fontSize: 14, color: '#374151' },
  shipButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  shipButtonText: { color: '#ffffff', fontWeight: 'bold' },
  pickingBadge: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickingText: { color: '#92400e', fontSize: 14, fontWeight: '600' },
});

