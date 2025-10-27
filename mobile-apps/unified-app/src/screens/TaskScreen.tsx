import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTaskUpdates } from '../hooks/useRealTimeData';
import { CorporateTheme } from '../styles/CorporateTheme';
import { RealTimeStatus } from '../components/RealTimeStatus';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskScreenProps {
  role: string;
}

export const TaskScreen: React.FC<TaskScreenProps> = ({ role }) => {
  const { tasks, loading, error, updateTask, refreshTasks } = useTaskUpdates(role);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTasks();
    setRefreshing(false);
  };

  const handleTaskStatusUpdate = async (taskId: string, newStatus: string) => {
    try {
      await updateTask(taskId, newStatus);
      Alert.alert('Başarılı', 'Görev durumu güncellendi');
    } catch (error) {
      Alert.alert('Hata', 'Görev durumu güncellenemedi');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return CorporateTheme.colors.warning[500];
      case 'in_progress':
        return CorporateTheme.colors.primary[500];
      case 'completed':
        return CorporateTheme.colors.success[500];
      case 'cancelled':
        return CorporateTheme.colors.error[500];
      default:
        return CorporateTheme.colors.gray[500];
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return CorporateTheme.colors.success[500];
      case 'medium':
        return CorporateTheme.colors.warning[500];
      case 'high':
        return CorporateTheme.colors.error[500];
      case 'critical':
        return CorporateTheme.colors.error[700];
      default:
        return CorporateTheme.colors.gray[500];
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Düşük';
      case 'medium':
        return 'Orta';
      case 'high':
        return 'Yüksek';
      case 'critical':
        return 'Kritik';
      default:
        return priority;
    }
  };

  const renderTask = ({ item }: { item: Task }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskTitle}>{item.title}</Text>
        <View style={styles.taskMeta}>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
          <View 
            style={[
              styles.priorityBadge, 
              { backgroundColor: getPriorityColor(item.priority) }
            ]}
          >
            <Text style={styles.priorityText}>
              {getPriorityText(item.priority)}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.taskDescription}>{item.description}</Text>
      
      <View style={styles.taskFooter}>
        <Text style={styles.taskAssignee}>Atanan: {item.assignedTo}</Text>
        <Text style={styles.taskDueDate}>
          Son Tarih: {new Date(item.dueDate).toLocaleDateString('tr-TR')}
        </Text>
      </View>
      
      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={() => handleTaskStatusUpdate(item.id, 'in_progress')}
          >
            <Text style={styles.actionButtonText}>Başlat</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {item.status === 'in_progress' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleTaskStatusUpdate(item.id, 'completed')}
          >
            <Text style={styles.actionButtonText}>Tamamla</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleTaskStatusUpdate(item.id, 'cancelled')}
          >
            <Text style={styles.actionButtonText}>İptal Et</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && tasks.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Görevler yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshTasks}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <RealTimeStatus />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Görevler</Text>
        <Text style={styles.headerSubtitle}>
          {tasks.length} görev bulundu
        </Text>
      </View>
      
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[CorporateTheme.colors.primary[500]]}
            tintColor={CorporateTheme.colors.primary[500]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CorporateTheme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CorporateTheme.colors.gray[50],
  },
  loadingText: {
    fontSize: 16,
    color: CorporateTheme.colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CorporateTheme.colors.gray[50],
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: CorporateTheme.colors.error[500],
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: CorporateTheme.colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CorporateTheme.colors.gray[900],
  },
  headerSubtitle: {
    fontSize: 14,
    color: CorporateTheme.colors.gray[600],
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CorporateTheme.colors.gray[900],
    flex: 1,
    marginRight: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  taskDescription: {
    fontSize: 14,
    color: CorporateTheme.colors.gray[600],
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  taskAssignee: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[500],
  },
  taskDueDate: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[500],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  startButton: {
    backgroundColor: CorporateTheme.colors.primary[500],
  },
  completeButton: {
    backgroundColor: CorporateTheme.colors.success[500],
  },
  cancelButton: {
    backgroundColor: CorporateTheme.colors.error[500],
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
