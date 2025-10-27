import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { CorporateCard } from '../components/ui/CorporateCard';
import { CorporateButton } from '../components/ui/CorporateButton';
import { CorporateTheme } from '../styles/CorporateTheme';

const { width } = Dimensions.get('window');

interface CustomerStats {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

const customerStats: CustomerStats[] = [
  {
    title: 'Active Orders',
    value: '3',
    change: '+1',
    changeType: 'positive',
    icon: '📦',
  },
  {
    title: 'Total Spent',
    value: '$2,450',
    change: '+$150',
    changeType: 'positive',
    icon: '💰',
  },
  {
    title: 'Deliveries',
    value: '24',
    change: '+3',
    changeType: 'positive',
    icon: '🚚',
  },
  {
    title: 'Rating Given',
    value: '4.8',
    change: '+0.2',
    changeType: 'positive',
    icon: '⭐',
  },
];

interface OrderItem {
  id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  total: number;
  orderDate: string;
  estimatedDelivery: string;
  trackingNumber: string;
  carrier: string;
}

const recentOrders: OrderItem[] = [
  {
    id: 'ORD-001',
    status: 'shipped',
    items: 5,
    total: 245.50,
    orderDate: '2024-01-14',
    estimatedDelivery: '2024-01-16',
    trackingNumber: 'FX123456789',
    carrier: 'FedEx',
  },
  {
    id: 'ORD-002',
    status: 'processing',
    items: 3,
    total: 189.75,
    orderDate: '2024-01-15',
    estimatedDelivery: '2024-01-18',
    trackingNumber: 'UP987654321',
    carrier: 'UPS',
  },
  {
    id: 'ORD-003',
    status: 'delivered',
    items: 8,
    total: 456.00,
    orderDate: '2024-01-10',
    estimatedDelivery: '2024-01-12',
    trackingNumber: 'DL456789123',
    carrier: 'DHL',
  },
];

export const CorporateCustomerDashboardScreen: React.FC = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return CorporateTheme.colors.warning[500];
      case 'processing':
        return CorporateTheme.colors.primary[600];
      case 'shipped':
        return CorporateTheme.colors.primary[600];
      case 'delivered':
        return CorporateTheme.colors.accent[600];
      case 'cancelled':
        return CorporateTheme.colors.error[600];
      default:
        return CorporateTheme.colors.secondary[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '🔄';
      case 'shipped':
        return '🚚';
      case 'delivered':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customer Dashboard</Text>
        <Text style={styles.headerSubtitle}>Track your orders and manage your account.</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {customerStats.map((stat, index) => (
          <CorporateCard key={index} variant="elevated" padding="md" style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statIcon}>
                <Text style={styles.statIconText}>{stat.icon}</Text>
              </View>
              <View style={styles.statInfo}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statTitle}>{stat.title}</Text>
                <View style={styles.statChange}>
                  <Text style={[
                    styles.statChangeText,
                    { color: stat.changeType === 'positive' ? CorporateTheme.colors.accent[600] : CorporateTheme.colors.error[600] }
                  ]}>
                    {stat.change}
                  </Text>
                  <Text style={styles.statChangeLabel}>vs last month</Text>
                </View>
              </View>
            </View>
          </CorporateCard>
        ))}
      </View>

      {/* Recent Orders */}
      <CorporateCard title="Recent Orders" variant="elevated" padding="md">
        <View style={styles.orders}>
          {recentOrders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderItem}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>Order #{order.id}</Text>
                  <Text style={styles.orderDate}>{order.orderDate}</Text>
                </View>
                <View style={styles.orderStatus}>
                  <Text style={styles.orderStatusText}>
                    {getStatusIcon(order.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.orderDetails}>
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Items</Text>
                  <Text style={styles.orderDetailValue}>{order.items}</Text>
                </View>
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Total</Text>
                  <Text style={styles.orderDetailValue}>{formatCurrency(order.total)}</Text>
                </View>
                <View style={styles.orderDetailItem}>
                  <Text style={styles.orderDetailLabel}>Status</Text>
                  <Text style={[styles.orderDetailValue, { color: getStatusColor(order.status) }]}>
                    {order.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              {order.status === 'shipped' && (
                <View style={styles.trackingInfo}>
                  <Text style={styles.trackingLabel}>Tracking: {order.trackingNumber}</Text>
                  <Text style={styles.trackingCarrier}>via {order.carrier}</Text>
                </View>
              )}
              <View style={styles.orderActions}>
                <CorporateButton
                  title="View Details"
                  onPress={() => {}}
                  variant="secondary"
                  size="sm"
                  style={styles.orderActionButton}
                />
                {order.status === 'shipped' && (
                  <CorporateButton
                    title="Track Package"
                    onPress={() => {}}
                    variant="primary"
                    size="sm"
                    style={styles.orderActionButton}
                  />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </CorporateCard>

      {/* Quick Actions */}
      <CorporateCard title="Quick Actions" variant="elevated" padding="md">
        <View style={styles.quickActions}>
          <CorporateButton
            title="Place New Order"
            onPress={() => {}}
            variant="primary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="Track Package"
            onPress={() => {}}
            variant="secondary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="View History"
            onPress={() => {}}
            variant="secondary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="Contact Support"
            onPress={() => {}}
            variant="secondary"
            size="md"
            style={styles.quickActionButton}
          />
        </View>
      </CorporateCard>

      {/* Service Information */}
      <CorporateCard title="Service Information" variant="elevated" padding="md">
        <View style={styles.serviceInfo}>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceLabel}>Delivery Zones</Text>
            <Text style={styles.serviceValue}>Nationwide</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceLabel}>Standard Delivery</Text>
            <Text style={styles.serviceValue}>2-3 Business Days</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceLabel}>Express Delivery</Text>
            <Text style={styles.serviceValue}>Next Day Available</Text>
          </View>
          <View style={styles.serviceItem}>
            <Text style={styles.serviceLabel}>Customer Support</Text>
            <Text style={styles.serviceValue}>24/7 Available</Text>
          </View>
        </View>
      </CorporateCard>

      {/* Notifications */}
      <CorporateCard title="Notifications" variant="elevated" padding="md">
        <View style={styles.notifications}>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationIcon}>📦</Text>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Order ORD-001 Shipped</Text>
              <Text style={styles.notificationText}>Your order has been shipped and is on its way.</Text>
              <Text style={styles.notificationTime}>2 hours ago</Text>
            </View>
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationIcon}>💰</Text>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Payment Processed</Text>
              <Text style={styles.notificationText}>Payment for order ORD-002 has been processed.</Text>
              <Text style={styles.notificationTime}>1 day ago</Text>
            </View>
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationIcon}>⭐</Text>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>Rate Your Experience</Text>
              <Text style={styles.notificationText}>Please rate your recent delivery experience.</Text>
              <Text style={styles.notificationTime}>3 days ago</Text>
            </View>
          </View>
        </View>
      </CorporateCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CorporateTheme.colors.secondary[50],
  },
  
  header: {
    padding: CorporateTheme.spacing.lg,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.secondary[200],
  },
  headerTitle: {
    fontSize: CorporateTheme.typography.fontSize['2xl'],
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: CorporateTheme.spacing.md,
    gap: CorporateTheme.spacing.md,
  },
  statCard: {
    width: (width - CorporateTheme.spacing.md * 3) / 2,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: CorporateTheme.borderRadius.lg,
    backgroundColor: CorporateTheme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CorporateTheme.spacing.md,
  },
  statIconText: {
    fontSize: 24,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: CorporateTheme.typography.fontSize.xl,
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  statTitle: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[600],
    marginBottom: CorporateTheme.spacing.xs,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChangeText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    marginRight: CorporateTheme.spacing.xs,
  },
  statChangeLabel: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[500],
  },
  
  orders: {
    gap: CorporateTheme.spacing.md,
  },
  orderItem: {
    backgroundColor: CorporateTheme.colors.secondary[50],
    borderRadius: CorporateTheme.borderRadius.md,
    padding: CorporateTheme.spacing.md,
    borderWidth: 1,
    borderColor: CorporateTheme.colors.secondary[200],
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: CorporateTheme.spacing.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  orderDate: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  orderStatus: {
    marginLeft: CorporateTheme.spacing.sm,
  },
  orderStatusText: {
    fontSize: 24,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CorporateTheme.spacing.sm,
  gap: CorporateTheme.spacing.md,
  },
  orderDetailItem: {
    flex: 1,
  },
  orderDetailLabel: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[500],
    marginBottom: CorporateTheme.spacing.xs,
  },
  orderDetailValue: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
  },
  trackingInfo: {
    marginTop: CorporateTheme.spacing.sm,
    paddingTop: CorporateTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: CorporateTheme.colors.secondary[200],
  },
  trackingLabel: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[700],
    marginBottom: CorporateTheme.spacing.xs,
  },
  trackingCarrier: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  orderActions: {
    flexDirection: 'row',
    gap: CorporateTheme.spacing.sm,
    marginTop: CorporateTheme.spacing.sm,
  },
  orderActionButton: {
    flex: 1,
  },
  
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CorporateTheme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
    minWidth: (width - CorporateTheme.spacing.md * 3) / 2,
  },
  
  serviceInfo: {
    gap: CorporateTheme.spacing.md,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: CorporateTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.secondary[200],
  },
  serviceLabel: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[700],
  },
  serviceValue: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
  },
  
  notifications: {
    gap: CorporateTheme.spacing.md,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: CorporateTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.secondary[200],
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: CorporateTheme.spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  notificationText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
    marginBottom: CorporateTheme.spacing.xs,
  },
  notificationTime: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[500],
  },
});
