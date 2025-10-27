import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRealTimeData } from '../hooks/useRealTimeData';
import { CorporateTheme } from '../styles/CorporateTheme';

interface RealTimeStatusProps {
  onReconnect?: () => void;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ onReconnect }) => {
  const { isConnected, connectionState, reconnectAttempts, connect } = useRealTimeData();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return CorporateTheme.colors.success[500];
      case 'connecting':
        return CorporateTheme.colors.warning[500];
      case 'disconnected':
        return CorporateTheme.colors.error[500];
      default:
        return CorporateTheme.colors.gray[500];
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Bağlı';
      case 'connecting':
        return 'Bağlanıyor...';
      case 'disconnected':
        return 'Bağlantı Yok';
      default:
        return 'Bilinmiyor';
    }
  };

  const handleReconnect = async () => {
    try {
      await connect();
      onReconnect?.();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <View 
          style={[
            styles.statusIndicator, 
            { backgroundColor: getStatusColor() }
          ]} 
        />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {reconnectAttempts > 0 && (
          <Text style={styles.attemptText}>
            ({reconnectAttempts} deneme)
          </Text>
        )}
      </View>
      
      {!isConnected && (
        <TouchableOpacity 
          style={styles.reconnectButton}
          onPress={handleReconnect}
        >
          <Text style={styles.reconnectText}>Yeniden Bağlan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CorporateTheme.colors.gray[50],
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.gray[200],
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: CorporateTheme.colors.gray[700],
  },
  attemptText: {
    fontSize: 12,
    color: CorporateTheme.colors.gray[500],
    marginLeft: 4,
  },
  reconnectButton: {
    backgroundColor: CorporateTheme.colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  reconnectText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
});
