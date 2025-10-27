import { useEffect, useState, useCallback } from 'react';
import { webSocketService } from '../services/websocket.service';
import { apiService } from '../services/api.service';

export interface RealTimeDataHook {
  isConnected: boolean;
  connectionState: string;
  reconnectAttempts: number;
  subscribe: (event: string, callback: (data: any) => void) => void;
  unsubscribe: (event: string, callback?: (data: any) => void) => void;
  sendMessage: (type: string, data: any) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useRealTimeData = (): RealTimeDataHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = useCallback(async () => {
    try {
      await webSocketService.connect();
      setIsConnected(true);
      setConnectionState('connected');
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setIsConnected(false);
      setConnectionState('disconnected');
    }
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    webSocketService.on(event, callback);
  }, []);

  const unsubscribe = useCallback((event: string, callback?: (data: any) => void) => {
    webSocketService.off(event, callback);
  }, []);

  const sendMessage = useCallback((type: string, data: any) => {
    webSocketService.sendMessage(type, data);
  }, []);

  useEffect(() => {
    // Set up connection state listeners
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    const handleReconnectAttempt = (attempts: number) => {
      setReconnectAttempts(attempts);
    };

    webSocketService.on('connect', handleConnect);
    webSocketService.on('disconnect', handleDisconnect);
    webSocketService.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      webSocketService.off('connect', handleConnect);
      webSocketService.off('disconnect', handleDisconnect);
      webSocketService.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, []);

  return {
    isConnected,
    connectionState,
    reconnectAttempts,
    subscribe,
    unsubscribe,
    sendMessage,
    connect,
    disconnect,
  };
};

export interface TaskUpdateHook {
  tasks: any[];
  loading: boolean;
  error: string | null;
  updateTask: (taskId: string, status: string, data?: any) => Promise<void>;
  refreshTasks: () => Promise<void>;
}

export const useTaskUpdates = (role: string): TaskUpdateHook => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, unsubscribe, sendMessage } = useRealTimeData();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getTasks(role);
      if (response.success) {
        setTasks(response.data);
      } else {
        setError(response.error || 'Failed to fetch tasks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [role]);

  const updateTask = useCallback(async (taskId: string, status: string, data?: any) => {
    try {
      setError(null);
      const response = await apiService.updateTaskStatus(taskId, status, data);
      if (response.success) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status, ...data } : task
          )
        );
        // Send real-time update
        sendMessage('task_status_update', { taskId, status, data });
      } else {
        setError(response.error || 'Failed to update task');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    }
  }, [sendMessage]);

  const refreshTasks = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const handleTaskUpdate = (data: any) => {
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === data.taskId ? { ...task, ...data } : task
        )
      );
    };

    subscribe('task_update', handleTaskUpdate);

    return () => {
      unsubscribe('task_update', handleTaskUpdate);
    };
  }, [subscribe, unsubscribe]);

  return {
    tasks,
    loading,
    error,
    updateTask,
    refreshTasks,
  };
};

export interface InventoryUpdateHook {
  inventory: any[];
  loading: boolean;
  error: string | null;
  updateInventory: (itemId: string, data: any) => Promise<void>;
  refreshInventory: () => Promise<void>;
}

export const useInventoryUpdates = (): InventoryUpdateHook => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, unsubscribe, sendMessage } = useRealTimeData();

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getInventory();
      if (response.success) {
        setInventory(response.data);
      } else {
        setError(response.error || 'Failed to fetch inventory');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateInventory = useCallback(async (itemId: string, data: any) => {
    try {
      setError(null);
      const response = await apiService.updateInventory(itemId, data);
      if (response.success) {
        // Update local state
        setInventory(prevInventory => 
          prevInventory.map(item => 
            item.id === itemId ? { ...item, ...data } : item
          )
        );
        // Send real-time update
        sendMessage('inventory_update', { itemId, ...data });
      } else {
        setError(response.error || 'Failed to update inventory');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory');
    }
  }, [sendMessage]);

  const refreshInventory = useCallback(async () => {
    await fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    const handleInventoryUpdate = (data: any) => {
      setInventory(prevInventory => 
        prevInventory.map(item => 
          item.id === data.itemId ? { ...item, ...data } : item
        )
      );
    };

    subscribe('inventory_update', handleInventoryUpdate);

    return () => {
      unsubscribe('inventory_update', handleInventoryUpdate);
    };
  }, [subscribe, unsubscribe]);

  return {
    inventory,
    loading,
    error,
    updateInventory,
    refreshInventory,
  };
};

export interface NotificationHook {
  notifications: any[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export const useNotifications = (): NotificationHook => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribe, unsubscribe } = useRealTimeData();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getNotifications();
      if (response.success) {
        setNotifications(response.data);
        setUnreadCount(response.data.filter((n: any) => !n.read).length);
      } else {
        setError(response.error || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      setError(null);
      const response = await apiService.markNotificationAsRead(notificationId);
      if (response.success) {
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true } 
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setError(response.error || 'Failed to mark notification as read');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read');
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const handleNewNotification = (data: any) => {
      setNotifications(prevNotifications => [data, ...prevNotifications]);
      setUnreadCount(prev => prev + 1);
    };

    subscribe('notification', handleNewNotification);

    return () => {
      unsubscribe('notification', handleNewNotification);
    };
  }, [subscribe, unsubscribe]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    refreshNotifications,
  };
};

export interface LocationTrackingHook {
  location: { latitude: number; longitude: number } | null;
  accuracy: number | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  updateLocation: (latitude: number, longitude: number, accuracy?: number) => Promise<void>;
}

export const useLocationTracking = (): LocationTrackingHook => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { sendMessage } = useRealTimeData();

  const startTracking = useCallback(() => {
    setIsTracking(true);
    // Start location tracking logic here
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    // Stop location tracking logic here
  }, []);

  const updateLocation = useCallback(async (latitude: number, longitude: number, accuracy?: number) => {
    try {
      setLocation({ latitude, longitude });
      if (accuracy !== undefined) {
        setAccuracy(accuracy);
      }
      
      // Send to server
      await apiService.updateLocation(latitude, longitude);
      
      // Send real-time update
      sendMessage('location_update', { latitude, longitude, accuracy });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }, [sendMessage]);

  return {
    location,
    accuracy,
    isTracking,
    startTracking,
    stopTracking,
    updateLocation,
  };
};
