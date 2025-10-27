import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from 'react-native-heroicons/solid';

export default function InvoicesScreen() {
  const [invoices] = useState([
    { id: 'INV-001', customer: 'ABC Ltd.', amount: 125000, status: 'paid', date: '2024-10-20' },
    { id: 'INV-002', customer: 'XYZ Corp', amount: 85000, status: 'pending', date: '2024-10-22', dueDate: '2024-11-05' },
    { id: 'INV-003', customer: 'DEF Inc.', amount: 220000, status: 'overdue', date: '2024-10-15', dueDate: '2024-10-30' },
    { id: 'INV-004', customer: 'GHI Co.', amount: 95000, status: 'pending', date: '2024-10-23', dueDate: '2024-11-07' },
  ]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon color="#10b981" size={24} />;
      case 'pending': return <ClockIcon color="#f59e0b" size={24} />;
      case 'overdue': return <XCircleIcon color="#ef4444" size={24} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#dcfce7';
      case 'pending': return '#fef3c7';
      case 'overdue': return '#fee2e2';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.subtitle}>{invoices.length} total invoices</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>₺125K</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>₺180K</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Overdue</Text>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>₺220K</Text>
        </View>
      </View>

      <View style={styles.invoicesSection}>
        {invoices.map((invoice) => (
          <View key={invoice.id} style={[styles.invoiceCard, { backgroundColor: getStatusColor(invoice.status) }]}>
            <View style={styles.invoiceHeader}>
              <View style={styles.invoiceLeft}>
                <Text style={styles.invoiceId}>{invoice.id}</Text>
                <Text style={styles.customer}>{invoice.customer}</Text>
              </View>
              {getStatusIcon(invoice.status)}
            </View>

            <View style={styles.invoiceDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.amount}>₺{(invoice.amount / 1000).toFixed(0)}K</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{invoice.date}</Text>
              </View>
              {invoice.dueDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Due:</Text>
                  <Text style={styles.detailValue}>{invoice.dueDate}</Text>
                </View>
              )}
            </View>

            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Details</Text>
            </TouchableOpacity>
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
  summaryCard: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  invoicesSection: { padding: 16 },
  invoiceCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  invoiceLeft: { flex: 1 },
  invoiceId: { fontSize: 18, fontWeight: 'bold' },
  customer: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  invoiceDetails: { gap: 6, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  amount: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  viewButton: { backgroundColor: '#ffffff', borderRadius: 8, padding: 12 },
  viewButtonText: { textAlign: 'center', fontWeight: '600', color: '#374151' },
});

