import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WMSWebSocketOptions {
  warehouseId?: string;
  onInventoryAlert?: (data: any) => void;
  onOperationUpdate?: (data: any) => void;
  onTrackingUpdate?: (data: any) => void;
  onAlert?: (data: any) => void;
}

export const useWMSWebSocket = (options: WMSWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/wms`, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('WMS WebSocket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WMS WebSocket disconnected');
    });

    socket.on('connected', (data) => {
      console.log('WMS WebSocket ready:', data);
    });

    // Inventory events
    socket.on('inventory:updated', (data) => {
      setLastUpdate(data);
      console.log('Inventory updated:', data);
    });

    socket.on('inventory:subscribed', (data) => {
      console.log('Subscribed to inventory updates:', data);
    });

    // Operation events
    socket.on('operation:updated', (data) => {
      setLastUpdate(data);
      if (options.onOperationUpdate) {
        options.onOperationUpdate(data);
      }
      console.log('Operation updated:', data);
    });

    socket.on('operations:subscribed', (data) => {
      console.log('Subscribed to operations updates:', data);
    });

    // Tracking events
    socket.on('tracking:updated', (data) => {
      setLastUpdate(data);
      if (options.onTrackingUpdate) {
        options.onTrackingUpdate(data);
      }
      console.log('Tracking updated:', data);
    });

    socket.on('tracking:subscribed', (data) => {
      console.log('Subscribed to tracking updates:', data);
    });

    // Alert events
    socket.on('alert', (data) => {
      setLastUpdate(data);
      if (options.onAlert) {
        options.onAlert(data);
      }
      console.log('Alert received:', data);
    });

    // Subscribe to inventory updates
    if (options.warehouseId) {
      socket.emit('inventory:subscribe');
      socket.emit('operations:subscribe');
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.warehouseId]);

  const subscribeToInventory = () => {
    if (socketRef.current) {
      socketRef.current.emit('inventory:subscribe');
    }
  };

  const subscribeToOperations = () => {
    if (socketRef.current) {
      socketRef.current.emit('operations:subscribe');
    }
  };

  const subscribeToTracking = (shipmentId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('tracking:subscribe', { shipmentId });
    }
  };

  const emitEvent = (event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    isConnected,
    lastUpdate,
    subscribeToInventory,
    subscribeToOperations,
    subscribeToTracking,
    emitEvent,
  };
};