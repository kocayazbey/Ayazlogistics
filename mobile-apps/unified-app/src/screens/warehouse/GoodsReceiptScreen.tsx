import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { QrCodeIcon, CheckCircleIcon } from 'react-native-heroicons/solid';

export default function GoodsReceiptScreen() {
  const [poNumber, setPoNumber] = useState('');
  const [items, setItems] = useState([
    { id: '1', sku: 'SKU-001', name: 'Product A', expected: 100, received: 0 },
    { id: '2', sku: 'SKU-002', name: 'Product B', expected: 50, received: 0 },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Goods Receipt</Text>
        <Text style={styles.subtitle}>Scan and receive incoming goods</Text>
      </View>

      <View style={styles.scanSection}>
        <Text style={styles.label}>Purchase Order Number</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="PO-2024-XXX"
            value={poNumber}
            onChangeText={setPoNumber}
          />
          <TouchableOpacity style={styles.scanButton}>
            <QrCodeIcon color="#ffffff" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>Items to Receive</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemSku}>{item.sku}</Text>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>
                Expected: {item.expected} | Received: {item.received}
              </Text>
            </View>
            <View style={styles.quantityControls}>
              <TouchableOpacity style={styles.quantityButton}>
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>0</Text>
              <TouchableOpacity style={styles.quantityButton}>
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.confirmButton}>
        <CheckCircleIcon color="#ffffff" size={20} />
        <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#10b981', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  scanSection: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  scanButton: { backgroundColor: '#10b981', borderRadius: 12, width: 56, justifyContent: 'center', alignItems: 'center' },
  itemsSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  itemCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12 },
  itemInfo: { marginBottom: 12 },
  itemSku: { fontSize: 12, color: '#6b7280' },
  itemName: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  itemQuantity: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  quantityButton: { width: 40, height: 40, backgroundColor: '#10b981', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  quantityButtonText: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  quantityValue: { fontSize: 24, fontWeight: 'bold', minWidth: 50, textAlign: 'center' },
  confirmButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, margin: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  confirmButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});

