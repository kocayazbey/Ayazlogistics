import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  namespace?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    namespace = '/tracking',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  useEffect(() => {
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

    socketRef.current = io(`${WS_URL}${namespace}`, {
      autoConnect,
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('shipment-update', (data) => {
      setLastUpdate(data);
    });

    socketRef.current.on('location-update', (data) => {
      setLastUpdate(data);
    });

    socketRef.current.on('alert', (data) => {
      setLastUpdate(data);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [namespace, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay]);

  const subscribeToShipment = (shipmentId: string) => {
    socketRef.current?.emit('subscribe-shipment', { shipmentId });
  };

  const unsubscribeFromShipment = (shipmentId: string) => {
    socketRef.current?.emit('unsubscribe-shipment', { shipmentId });
  };

  const emit = (event: string, data: any) => {
    socketRef.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback);
  };

  const off = (event: string) => {
    socketRef.current?.off(event);
  };

  return {
    socket: socketRef.current,
    isConnected,
    lastUpdate,
    subscribeToShipment,
    unsubscribeFromShipment,
    emit,
    on,
    off,
  };
}

