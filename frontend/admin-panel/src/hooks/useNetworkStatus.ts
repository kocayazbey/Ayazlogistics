import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

export interface NetworkStatus {
  isOnline: boolean;
  isConnecting: boolean;
  lastOnline: Date | null;
  connectionType: string;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isConnecting: false,
    lastOnline: navigator.onLine ? new Date() : null,
    connectionType: (navigator as any).connection?.effectiveType || 'unknown',
  });

  const toast = useToast();

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        lastOnline: new Date(),
        isConnecting: false,
      }));

      // Clear any pending reconnect attempts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      toast.success('Connection restored');
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isConnecting: false,
      }));

      toast.error('Connection lost. Working offline.');
    };

    const handleConnectionChange = () => {
      const connection = (navigator as any).connection;
      if (connection) {
        setStatus(prev => ({
          ...prev,
          connectionType: connection.effectiveType || 'unknown',
        }));
      }
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Attempt to reconnect when offline
    if (!navigator.onLine) {
      setStatus(prev => ({ ...prev, isConnecting: true }));

      reconnectTimeout = setTimeout(() => {
        if (!navigator.onLine) {
          setStatus(prev => ({ ...prev, isConnecting: false }));
        }
      }, 5000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [toast]);

  const retryConnection = () => {
    if (!navigator.onLine) {
      setStatus(prev => ({ ...prev, isConnecting: true }));
      toast.info('Attempting to reconnect...');

      setTimeout(() => {
        if (navigator.onLine) {
          setStatus(prev => ({
            ...prev,
            isOnline: true,
            lastOnline: new Date(),
            isConnecting: false,
          }));
          toast.success('Connection restored');
        } else {
          setStatus(prev => ({ ...prev, isConnecting: false }));
          toast.error('Still offline. Please check your internet connection.');
        }
      }, 2000);
    }
  };

  return {
    ...status,
    retryConnection,
    isSlowConnection: status.connectionType === 'slow-2g' || status.connectionType === '2g',
  };
}
