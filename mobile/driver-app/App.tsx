import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

const Stack = createStackNavigator();

// Home Screen
function HomeScreen({ navigation }: any) {
  const tasks = [
    { id: '1', type: 'Pickup', address: 'Istanbul, Maslak', time: '10:00', status: 'pending' },
    { id: '2', type: 'Delivery', address: 'Ankara, Çankaya', time: '14:30', status: 'in_progress' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => navigation.navigate('TaskDetail', { task: item })}
          >
            <View style={styles.taskHeader}>
              <Text style={styles.taskType}>{item.type}</Text>
              <Text style={[styles.status, item.status === 'pending' ? styles.pending : styles.inProgress]}>
                {item.status}
              </Text>
            </View>
            <Text style={styles.taskAddress}>{item.address}</Text>
            <Text style={styles.taskTime}>⏰ {item.time}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// Task Detail Screen
function TaskDetailScreen({ route }: any) {
  const { task } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>{task.type}</Text>
        <Text style={styles.detailText}>📍 {task.address}</Text>
        <Text style={styles.detailText}>⏰ {task.time}</Text>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Start Navigation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]}>
          <Text style={styles.buttonTextSecondary}>Mark as Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'AyazLogistics Driver' }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  inProgress: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  taskAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  taskTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  detailText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  buttonTextSecondary: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
});

