import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';

export default function EmployeesScreen() {
  const [employees] = useState([
    { id: '1', name: 'Ahmet Yılmaz', position: 'Warehouse Manager', department: 'Operations', status: 'active', avatar: 'https://i.pravatar.cc/150?img=12' },
    { id: '2', name: 'Ayşe Demir', position: 'Accountant', department: 'Finance', status: 'active', avatar: 'https://i.pravatar.cc/150?img=45' },
    { id: '3', name: 'Mehmet Kaya', position: 'Forklift Operator', department: 'Operations', status: 'on_leave', avatar: 'https://i.pravatar.cc/150?img=33' },
    { id: '4', name: 'Zeynep Şahin', position: 'Sales Rep', department: 'Sales', status: 'active', avatar: 'https://i.pravatar.cc/150?img=24' },
  ]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Employees</Text>
        <Text style={styles.subtitle}>{employees.length} total employees</Text>
      </View>

      <View style={styles.employeesSection}>
        {employees.map((employee) => (
          <TouchableOpacity key={employee.id} style={styles.employeeCard}>
            <Image source={{ uri: employee.avatar }} style={styles.avatar} />
            <View style={styles.employeeInfo}>
              <Text style={styles.employeeName}>{employee.name}</Text>
              <Text style={styles.position}>{employee.position}</Text>
              <Text style={styles.department}>📍 {employee.department}</Text>
            </View>
            <View style={[styles.statusBadge, employee.status === 'on_leave' && styles.leaveBadge]}>
              <Text style={styles.statusText}>
                {employee.status === 'active' ? '✅ Active' : '🏖️ Leave'}
              </Text>
            </View>
          </TouchableOpacity>
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
  employeesSection: { padding: 16 },
  employeeCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: 'bold' },
  position: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  department: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  leaveBadge: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 12, fontWeight: '600' },
});


