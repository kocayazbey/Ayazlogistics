import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ClipboardListIcon, CheckCircleIcon, ClockIcon, CameraIcon, TruckIcon, MapPinIcon, PhoneIcon } from 'react-native-heroicons/solid';
import { ClockIcon as ClockOutline, PhoneIcon as PhoneOutline } from 'react-native-heroicons/outline';

interface Task {
  id: string;
  type: 'pickup' | 'delivery' | 'inspection' | 'maintenance';
  title: string;
  description: string;
  location: string;
  customer?: string;
  time: string;
  estimatedDuration: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  payment?: number;
  requirements?: string[];
  contactPerson?: {
    name: string;
    phone: string;
  };
}

// API service for fetching tasks
const fetchTasks = async (): Promise<Task[]> => {
  try {
    // Replace with actual API endpoint
    const token = await getStoredToken();
    const response = await fetch('https://api.ayazlogistics.com/api/mobile/tasks', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
    // Fallback to mock data if API fails
    return getMockTasks();
  }
};

// Token storage implementation
const getStoredToken = async (): Promise<string> => {
  try {
    // In a real app, this would use AsyncStorage or similar
    // For now, return a mock token
    return 'mock-jwt-token';
  } catch (error) {
    console.error('Error getting stored token:', error);
    return '';
  }
};

// API service for updating task status
const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<void> => {
  try {
    const token = await getStoredToken();
    const response = await fetch(`https://api.ayazlogistics.com/api/mobile/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update task status');
    }
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

export default function TasksScreen() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

const getMockTasks = (): Task[] => [
  {
    id: 't1',
    type: 'pickup',
    title: 'Palet Teslim Alma',
    description: '25 palet elektronik eşya teslim alma işlemi',
    location: 'İstanbul Depo - Maslak',
    customer: 'ABC Lojistik A.Ş.',
    time: '08:00',
    estimatedDuration: '45 dk',
    priority: 'high',
    status: 'completed',
    payment: 150,
    contactPerson: { name: 'Ahmet Kaya', phone: '+90 555 123 4567' }
  },
    {
      id: 't2',
      type: 'delivery',
      title: 'Dağıtım Teslimatı',
      description: '10 palet tekstil ürünleri teslimatı',
      location: 'İzmit Müşteri A - Merkez',
      customer: 'XYZ Tekstil Ltd.',
      time: '10:30',
      estimatedDuration: '30 dk',
      priority: 'medium',
      status: 'completed',
      payment: 100,
      contactPerson: { name: 'Fatma Şahin', phone: '+90 555 987 6543' }
    },
    {
      id: 't3',
      type: 'delivery',
      title: 'Büyük Teslimat',
      description: '15 palet inşaat malzemesi teslimatı',
      location: 'Bolu Dağıtım Merkezi',
      customer: 'KONUT Yapı A.Ş.',
      time: '13:00',
      estimatedDuration: '60 dk',
      priority: 'urgent',
      status: 'in_progress',
      payment: 200,
      contactPerson: { name: 'Mehmet Öz', phone: '+90 555 456 7890' }
    },
    {
      id: 't4',
      type: 'inspection',
      title: 'Araç Bakım Kontrolü',
      description: 'Günlük araç bakım ve güvenlik kontrolü',
      location: 'Gerede Dinlenme Tesisi',
      time: '15:00',
      estimatedDuration: '20 dk',
      priority: 'medium',
      status: 'pending',
      requirements: ['Lastik basıncı kontrolü', 'Motor yağı seviyesi', 'Fren sistemi']
    },
    {
      id: 't5',
      type: 'delivery',
      title: 'Son Teslimat',
      description: '5 palet gıda ürünleri teslimatı',
      location: 'Ankara Depo - Sincan',
      customer: 'MARKET A.Ş.',
      time: '17:30',
      estimatedDuration: '40 dk',
      priority: 'low',
      status: 'pending',
      payment: 120,
      contactPerson: { name: 'Ayşe Yılmaz', phone: '+90 555 321 0987' }
    },
  ];

  // Fetch tasks on component mount and when tab changes
  useEffect(() => {
    loadTasks();
  }, [activeTab]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const fetchedTasks = await fetchTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load tasks. Using offline data.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  const handleAcceptTask = (task: Task) => {
    Alert.alert(
      'Görev Kabul',
      `${task.title} görevini kabul etmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: () => {
            setTasks(prev => prev.map(t =>
              t.id === task.id ? { ...t, status: 'in_progress' as const } : t
            ));
            Alert.alert('Başarılı', 'Görev kabul edildi ve başlatıldı');
          }
        },
      ]
    );
  };

  const handleCompleteTask = (task: Task) => {
    Alert.alert(
      'Görev Tamamla',
      `${task.title} görevini tamamladığınızdan emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tamamla',
          onPress: () => {
            setTasks(prev => prev.map(t =>
              t.id === task.id ? { ...t, status: 'completed' as const } : t
            ));
            Alert.alert('Başarılı', 'Görev başarıyla tamamlandı');
          }
        },
      ]
    );
  };

  const handleCallContact = (phone: string) => {
    Alert.alert('Arama', `${phone} numarasını aramak istiyor musunuz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Ara', style: 'default' }
    ]);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'pickup': return '🚚';
      case 'delivery': return '📦';
      case 'inspection': return '🔍';
      case 'maintenance': return '🔧';
      default: return '📋';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'in_progress': return 'Devam Ediyor';
      case 'pending': return 'Bekliyor';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Günlük Görevler</Text>
        <Text style={styles.headerSubtitle}>
          {totalCount} görev • {completedCount} tamamlandı
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'pending', label: 'Bekleyen' },
          { key: 'in_progress', label: 'Devam Eden' },
          { key: 'completed', label: 'Tamamlanan' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks List */}
      {filteredTasks.map((task) => (
        <View key={task.id} style={[styles.taskCard, task.status === 'completed' && styles.completedCard]}>
          <View style={styles.taskHeader}>
            <View style={styles.taskType}>
              <Text style={styles.taskTypeEmoji}>{getTaskIcon(task.type)}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
                <Text style={styles.priorityText}>
                  {task.priority === 'urgent' ? 'Acil' : task.priority === 'high' ? 'Yüksek' : task.priority === 'medium' ? 'Orta' : 'Düşük'}
                </Text>
              </View>
            </View>
            <View style={styles.taskStatus}>
              <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>
                {getStatusText(task.status)}
              </Text>
            </View>
          </View>

            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskDescription}>{task.description}</Text>

            <View style={styles.taskDetails}>
              <View style={styles.detailRow}>
                <MapPinIcon color="#6b7280" size={16} />
                <Text style={styles.detailText}>{task.location}</Text>
              </View>

              <View style={styles.detailRow}>
                <ClockIcon color="#6b7280" size={16} />
                <Text style={styles.detailText}>{task.time} • {task.estimatedDuration}</Text>
              </View>

              {task.customer && (
                <View style={styles.detailRow}>
                  <TruckIcon color="#6b7280" size={16} />
                  <Text style={styles.detailText}>{task.customer}</Text>
                </View>
              )}

              {task.payment && (
                <View style={styles.detailRow}>
                  <Text style={styles.paymentText}>💰 ₺{task.payment}</Text>
                </View>
              )}
            </View>

            {task.contactPerson && (
              <View style={styles.contactContainer}>
                <Text style={styles.contactLabel}>İletişim:</Text>
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleCallContact(task.contactPerson!.phone)}
                >
                  <PhoneOutline color="#3b82f6" size={16} />
                  <Text style={styles.contactText}>{task.contactPerson.name} • {task.contactPerson.phone}</Text>
                </TouchableOpacity>
              </View>
            )}

            {task.requirements && task.requirements.length > 0 && (
              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Gereksinimler:</Text>
                {task.requirements.map((req, index) => (
                  <Text key={index} style={styles.requirementItem}>• {req}</Text>
                ))}
              </View>
            )}
          </View>

          {/* Task Actions */}
          {task.status === 'pending' && (
            <TouchableOpacity style={styles.acceptButton} onPress={() => handleAcceptTask(task)}>
              <Text style={styles.acceptButtonText}>Görevi Kabul Et</Text>
            </TouchableOpacity>
          )}

          {task.status === 'in_progress' && (
            <View style={styles.taskActions}>
              <TouchableOpacity style={styles.photoButton}>
                <CameraIcon color="#3b82f6" size={20} />
                <Text style={styles.photoButtonText}>Fotoğraf Çek</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.completeButton} onPress={() => handleCompleteTask(task)}>
                <CheckCircleIcon color="#ffffff" size={20} />
                <Text style={styles.completeButtonText}>Tamamla</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { marginBottom: 20, paddingTop: 60, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1f2937' },
  headerSubtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },

  // Tab Container
  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  activeTabText: { color: '#ffffff' },

  // Task Card
  taskCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  completedCard: { opacity: 0.7 },

  // Task Header
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  taskType: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskTypeEmoji: { fontSize: 24 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  priorityText: { fontSize: 10, fontWeight: '600', color: '#ffffff' },
  taskStatus: {},
  statusText: { fontSize: 14, fontWeight: '600' },

  // Task Info
  taskInfo: { marginBottom: 16 },
  taskTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  taskDescription: { fontSize: 14, color: '#6b7280', marginBottom: 12 },

  // Task Details
  taskDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#6b7280', flex: 1 },
  paymentText: { fontSize: 16, fontWeight: '600', color: '#10b981' },

  // Contact
  contactContainer: { marginBottom: 12 },
  contactLabel: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  contactButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, gap: 8 },
  contactText: { fontSize: 14, color: '#3b82f6', flex: 1 },

  // Requirements
  requirementsContainer: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 12 },
  requirementsTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  requirementItem: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  // Task Actions
  acceptButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center' },
  acceptButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  taskActions: { flexDirection: 'row', gap: 12 },
  photoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#3b82f6' },
  photoButtonText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  completeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  completeButtonText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});

