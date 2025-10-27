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

interface DriverStats {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

const driverStats: DriverStats[] = [
  {
    title: 'Today\'s Deliveries',
    value: '8',
    change: '+2',
    changeType: 'positive',
    icon: '📦',
  },
  {
    title: 'Hours Worked',
    value: '6.5h',
    change: '+0.5h',
    changeType: 'positive',
    icon: '⏰',
  },
  {
    title: 'Earnings',
    value: '$245',
    change: '+$35',
    changeType: 'positive',
    icon: '💰',
  },
  {
    title: 'Rating',
    value: '4.9',
    change: '+0.1',
    changeType: 'positive',
    icon: '⭐',
  },
];

interface DeliveryTask {
  id: string;
  customer: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedTime: string;
  distance: string;
  notes: string;
}

const deliveryTasks: DeliveryTask[] = [
  {
    id: 'DEL-001',
    customer: 'Acme Corporation',
    address: '123 Business St, Downtown',
    status: 'in_progress',
    priority: 'high',
    estimatedTime: '2:30 PM',
    distance: '5.2 km',
    notes: 'Call upon arrival',
  },
  {
    id: 'DEL-002',
    customer: 'Tech Solutions',
    address: '456 Tech Ave, Tech District',
    status: 'pending',
    priority: 'medium',
    estimatedTime: '3:15 PM',
    distance: '8.7 km',
    notes: 'Leave at reception',
  },
  {
    id: 'DEL-003',
    customer: 'Global Industries',
    address: '789 Industrial Blvd, Industrial Zone',
    status: 'pending',
    priority: 'low',
    estimatedTime: '4:00 PM',
    distance: '12.3 km',
    notes: 'Contact security for access',
  },
];

export const CorporateDriverDashboardScreen: React.FC = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return CorporateTheme.colors.primary[600];
      case 'pending':
        return CorporateTheme.colors.warning[500];
      case 'completed':
        return CorporateTheme.colors.accent[600];
      default:
        return CorporateTheme.colors.secondary[500];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return CorporateTheme.colors.error[600];
      case 'medium':
        return CorporateTheme.colors.warning[500];
      case 'low':
        return CorporateTheme.colors.accent[600];
      default:
        return CorporateTheme.colors.secondary[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return '🚚';
      case 'pending':
        return '⏳';
      case 'completed':
        return '✅';
      default:
        return '📋';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back! Here's your delivery schedule.</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {driverStats.map((stat, index) => (
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
                  <Text style={styles.statChangeLabel}>vs yesterday</Text>
                </View>
              </View>
            </View>
          </CorporateCard>
        ))}
      </View>

      {/* Current Route */}
      <CorporateCard title="Current Route" variant="elevated" padding="md">
        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Route ID</Text>
            <Text style={styles.routeValue}>RT-001</Text>
          </View>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Total Stops</Text>
            <Text style={styles.routeValue}>8</Text>
          </View>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Completed</Text>
            <Text style={styles.routeValue}>3</Text>
          </View>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Estimated Finish</Text>
            <Text style={styles.routeValue}>5:30 PM</Text>
          </View>
        </View>
        <View style={styles.routeProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '37.5%' }]} />
          </View>
          <Text style={styles.progressText}>37.5% Complete</Text>
        </View>
      </CorporateCard>

      {/* Delivery Tasks */}
      <CorporateCard title="Today's Deliveries" variant="elevated" padding="md">
        <View style={styles.deliveries}>
          {deliveryTasks.map((task) => (
            <TouchableOpacity key={task.id} style={styles.deliveryItem}>
              <View style={styles.deliveryHeader}>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryCustomer}>{task.customer}</Text>
                  <Text style={styles.deliveryAddress}>{task.address}</Text>
                </View>
                <View style={styles.deliveryStatus}>
                  <Text style={styles.deliveryStatusText}>
                    {getStatusIcon(task.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.deliveryDetails}>
                <View style={styles.deliveryDetailItem}>
                  <Text style={styles.deliveryDetailLabel}>Priority</Text>
                  <Text style={[styles.deliveryDetailValue, { color: getPriorityColor(task.priority) }]}>
                    {task.priority.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.deliveryDetailItem}>
                  <Text style={styles.deliveryDetailLabel}>ETA</Text>
                  <Text style={styles.deliveryDetailValue}>{task.estimatedTime}</Text>
                </View>
                <View style={styles.deliveryDetailItem}>
                  <Text style={styles.deliveryDetailLabel}>Distance</Text>
                  <Text style={styles.deliveryDetailValue}>{task.distance}</Text>
                </View>
              </View>
              {task.notes && (
                <View style={styles.deliveryNotes}>
                  <Text style={styles.deliveryNotesText}>📝 {task.notes}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </CorporateCard>

      {/* Quick Actions */}
      <CorporateCard title="Quick Actions" variant="elevated" padding="md">
        <View style={styles.quickActions}>
          <CorporateButton
            title="Start Delivery"
            onPress={() => {}}
            variant="primary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="Mark Complete"
            onPress={() => {}}
            variant="success"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="Report Issue"
            onPress={() => {}}
            variant="warning"
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

      {/* Performance Metrics */}
      <CorporateCard title="Performance Metrics" variant="elevated" padding="md">
        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>On-time Delivery Rate</Text>
            <Text style={styles.metricValue}>96.2%</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '96.2%', backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Customer Rating</Text>
            <Text style={styles.metricValue}>4.9/5</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '98%', backgroundColor: CorporateTheme.colors.primary[600] }]} />
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Fuel Efficiency</Text>
            <Text style={styles.metricValue}>8.5 L/100km</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '85%', backgroundColor: CorporateTheme.colors.warning[500] }]} />
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
  
  routeInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: CorporateTheme.spacing.md,
  },
  routeItem: {
    width: '50%',
    marginBottom: CorporateTheme.spacing.sm,
  },
  routeLabel: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[600],
    marginBottom: CorporateTheme.spacing.xs,
  },
  routeValue: {
    fontSize: CorporateTheme.typography.fontSize.lg,
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: CorporateTheme.colors.secondary[900],
  },
  routeProgress: {
    marginTop: CorporateTheme.spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: CorporateTheme.colors.secondary[200],
    borderRadius: CorporateTheme.borderRadius.sm,
    overflow: 'hidden',
    marginBottom: CorporateTheme.spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: CorporateTheme.colors.primary[600],
    borderRadius: CorporateTheme.borderRadius.sm,
  },
  progressText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[600],
    textAlign: 'center',
  },
  
  deliveries: {
    gap: CorporateTheme.spacing.md,
  },
  deliveryItem: {
    backgroundColor: CorporateTheme.colors.secondary[50],
    borderRadius: CorporateTheme.borderRadius.md,
    padding: CorporateTheme.spacing.md,
    borderWidth: 1,
    borderColor: CorporateTheme.colors.secondary[200],
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: CorporateTheme.spacing.sm,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryCustomer: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  deliveryAddress: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  deliveryStatus: {
    marginLeft: CorporateTheme.spacing.sm,
  },
  deliveryStatusText: {
    fontSize: 24,
  },
  deliveryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: CorporateTheme.spacing.sm,
  },
  deliveryDetailItem: {
    flex: 1,
  },
  deliveryDetailLabel: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[500],
    marginBottom: CorporateTheme.spacing.xs,
  },
  deliveryDetailValue: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
  },
  deliveryNotes: {
    marginTop: CorporateTheme.spacing.sm,
    paddingTop: CorporateTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: CorporateTheme.colors.secondary[200],
  },
  deliveryNotesText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
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
  
  metrics: {
    gap: CorporateTheme.spacing.lg,
  },
  metricItem: {
    marginBottom: CorporateTheme.spacing.md,
  },
  metricLabel: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[700],
    marginBottom: CorporateTheme.spacing.xs,
  },
  metricValue: {
    fontSize: CorporateTheme.typography.fontSize.lg,
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.sm,
  },
  metricBar: {
    height: 8,
    backgroundColor: CorporateTheme.colors.secondary[200],
    borderRadius: CorporateTheme.borderRadius.sm,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: CorporateTheme.borderRadius.sm,
  },
});
