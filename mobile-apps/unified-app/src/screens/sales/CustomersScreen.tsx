import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { PhoneIcon, EnvelopeIcon } from 'react-native-heroicons/outline';

export default function CustomersScreen() {
  const [customers] = useState([
    { id: '1', name: 'Tech Corp', contact: 'John Doe', phone: '+90 555 123 4567', email: 'john@techcorp.com', revenue: 2500000, status: 'active' },
    { id: '2', name: 'Retail Inc.', contact: 'Jane Smith', phone: '+90 555 234 5678', email: 'jane@retail.com', revenue: 1800000, status: 'active' },
    { id: '3', name: 'Manufacturing Ltd.', contact: 'Bob Johnson', phone: '+90 555 345 6789', email: 'bob@manuf.com', revenue: 3200000, status: 'vip' },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <Text style={styles.subtitle}>{customers.length} customers</Text>
      </View>

      <View style={styles.customersSection}>
        {customers.map((customer) => (
          <View key={customer.id} style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerLeft}>
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.contactName}>👤 {customer.contact}</Text>
              </View>
              {customer.status === 'vip' && (
                <View style={styles.vipBadge}>
                  <Text style={styles.vipText}>⭐ VIP</Text>
                </View>
              )}
            </View>

            <View style={styles.customerDetails}>
              <View style={styles.detailRow}>
                <PhoneIcon color="#6b7280" size={16} />
                <Text style={styles.detailText}>{customer.phone}</Text>
              </View>
              <View style={styles.detailRow}>
                <EnvelopeIcon color="#6b7280" size={16} />
                <Text style={styles.detailText}>{customer.email}</Text>
              </View>
              <View style={styles.revenueRow}>
                <Text style={styles.revenueLabel}>Total Revenue:</Text>
                <Text style={styles.revenueValue}>₺{(customer.revenue / 1000000).toFixed(1)}M</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionButton}>
                <PhoneIcon color="#3b82f6" size={18} />
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <EnvelopeIcon color="#3b82f6" size={18} />
                <Text style={styles.actionButtonText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#ec4899', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  customersSection: { padding: 16 },
  customerCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12 },
  customerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  customerLeft: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: 'bold' },
  contactName: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  vipBadge: { backgroundColor: '#fef3c7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  vipText: { fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  customerDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#374151' },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  revenueLabel: { fontSize: 14, color: '#6b7280' },
  revenueValue: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  actionButtonText: { color: '#3b82f6', fontWeight: '600' },
});


