import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CheckCircleIcon, ArrowDownIcon, ArrowUpIcon } from 'react-native-heroicons/solid';

export default function PaymentsScreen() {
  const [payments] = useState([
    { id: 'PAY-001', type: 'incoming', customer: 'ABC Ltd.', amount: 125000, method: 'Bank Transfer', date: '2024-10-20' },
    { id: 'PAY-002', type: 'outgoing', vendor: 'Supplier XYZ', amount: 45000, method: 'Check', date: '2024-10-21' },
    { id: 'PAY-003', type: 'incoming', customer: 'DEF Inc.', amount: 85000, method: 'Credit Card', date: '2024-10-22' },
    { id: 'PAY-004', type: 'outgoing', vendor: 'Logistics Co.', amount: 35000, method: 'Bank Transfer', date: '2024-10-23' },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>{payments.length} transactions</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <ArrowDownIcon color="#10b981" size={20} />
          <Text style={styles.summaryLabel}>Incoming</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>₺210K</Text>
        </View>
        <View style={styles.summaryCard}>
          <ArrowUpIcon color="#ef4444" size={20} />
          <Text style={styles.summaryLabel}>Outgoing</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>₺80K</Text>
        </View>
      </View>

      <View style={styles.paymentsSection}>
        {payments.map((payment) => (
          <View key={payment.id} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.iconContainer}>
                {payment.type === 'incoming' ? (
                  <ArrowDownIcon color="#10b981" size={24} />
                ) : (
                  <ArrowUpIcon color="#ef4444" size={24} />
                )}
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentId}>{payment.id}</Text>
                <Text style={styles.entity}>
                  {payment.type === 'incoming' ? payment.customer : payment.vendor}
                </Text>
                <Text style={styles.method}>{payment.method}</Text>
              </View>
              <View style={styles.paymentRight}>
                <Text style={[styles.amount, { color: payment.type === 'incoming' ? '#10b981' : '#ef4444' }]}>
                  {payment.type === 'incoming' ? '+' : '-'}₺{(payment.amount / 1000).toFixed(0)}K
                </Text>
                <Text style={styles.date}>{payment.date}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#f59e0b', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  summary: { flexDirection: 'row', padding: 16, gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  summaryValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  paymentsSection: { padding: 16 },
  paymentCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12 },
  paymentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' },
  paymentInfo: { flex: 1 },
  paymentId: { fontSize: 12, color: '#6b7280' },
  entity: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  method: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  amount: { fontSize: 18, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
});

