import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { CameraIcon, QrCodeIcon } from 'react-native-heroicons/solid';

export default function PalletAddressingScreen() {
  const [palletCode, setPalletCode] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [recentAddressing, setRecentAddressing] = useState([
    { id: '1', pallet: 'PLT-2024-001', location: 'A-01-02-03', time: '14:30' },
    { id: '2', pallet: 'PLT-2024-002', location: 'A-01-02-04', time: '14:25' },
    { id: '3', pallet: 'PLT-2024-003', location: 'B-02-01-01', time: '14:20' },
  ]);

  const handleScan = (type: 'pallet' | 'location') => {
    Alert.alert('Scan', `Scanning ${type}...`);
  };

  const handleAssign = () => {
    if (!palletCode || !locationCode) {
      Alert.alert('Error', 'Please scan both pallet and location');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      pallet: palletCode,
      location: locationCode,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setRecentAddressing([newItem, ...recentAddressing]);
    setPalletCode('');
    setLocationCode('');
    Alert.alert('Success', 'Pallet assigned successfully');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pallet Addressing</Text>
        <Text style={styles.subtitle}>Scan and assign pallet location</Text>
      </View>

      <View style={styles.scanSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pallet Code</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="PLT-2024-XXX"
              value={palletCode}
              onChangeText={setPalletCode}
            />
            <TouchableOpacity style={styles.scanButton} onPress={() => handleScan('pallet')}>
              <QrCodeIcon color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location Code</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="A-01-02-03"
              value={locationCode}
              onChangeText={setLocationCode}
            />
            <TouchableOpacity style={styles.scanButton} onPress={() => handleScan('location')}>
              <QrCodeIcon color="#ffffff" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.assignButton} onPress={handleAssign}>
          <Text style={styles.assignButtonText}>Assign Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Recent Addressing</Text>
        {recentAddressing.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyPallet}>{item.pallet}</Text>
              <Text style={styles.historyLocation}>📍 {item.location}</Text>
            </View>
            <Text style={styles.historyTime}>{item.time}</Text>
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
  scanSection: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151' },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  scanButton: { backgroundColor: '#3b82f6', borderRadius: 12, width: 56, justifyContent: 'center', alignItems: 'center' },
  assignButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, marginTop: 8 },
  assignButtonText: { color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
  historySection: { padding: 16 },
  historyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  historyCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyLeft: { flex: 1 },
  historyPallet: { fontSize: 16, fontWeight: '600' },
  historyLocation: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  historyTime: { fontSize: 12, color: '#9ca3af' },
});

