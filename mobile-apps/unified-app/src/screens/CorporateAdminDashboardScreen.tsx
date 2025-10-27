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

interface AdminStats {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

const adminStats: AdminStats[] = [
  {
    title: 'Total Revenue',
    value: '$2.4M',
    change: '+12.5%',
    changeType: 'positive',
    icon: '💰',
  },
  {
    title: 'Active Orders',
    value: '1,247',
    change: '+8.2%',
    changeType: 'positive',
    icon: '📦',
  },
  {
    title: 'Vehicles',
    value: '89',
    change: '-2.1%',
    changeType: 'negative',
    icon: '🚚',
  },
  {
    title: 'Customer Satisfaction',
    value: '94.2%',
    change: '+1.8%',
    changeType: 'positive',
    icon: '⭐',
  },
];

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

const systemAlerts: SystemAlert[] = [
  {
    id: 'ALERT-001',
    type: 'warning',
    title: 'Low Fuel Alert',
    message: 'Vehicle VH-003 has low fuel (15% remaining)',
    timestamp: '2 hours ago',
    priority: 'medium',
  },
  {
    id: 'ALERT-002',
    type: 'error',
    title: 'System Error',
    message: 'Database connection timeout in WMS module',
    timestamp: '4 hours ago',
    priority: 'high',
  },
  {
    id: 'ALERT-003',
    type: 'info',
    title: 'Maintenance Due',
    message: 'Vehicle VH-007 requires scheduled maintenance',
    timestamp: '6 hours ago',
    priority: 'low',
  },
  {
    id: 'ALERT-004',
    type: 'success',
    title: 'Backup Complete',
    message: 'Daily backup completed successfully',
    timestamp: '8 hours ago',
    priority: 'low',
  },
];

export const CorporateAdminDashboardScreen: React.FC = () => {
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return CorporateTheme.colors.warning[500];
      case 'error':
        return CorporateTheme.colors.error[600];
      case 'info':
        return CorporateTheme.colors.primary[600];
      case 'success':
        return CorporateTheme.colors.accent[600];
      default:
        return CorporateTheme.colors.secondary[500];
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return '📋';
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

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>System overview and management controls.</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {adminStats.map((stat, index) => (
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

      {/* System Status */}
      <CorporateCard title="System Status" variant="elevated" padding="md">
        <View style={styles.systemStatus}>
          <View style={styles.statusItem}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
            <Text style={styles.statusLabel}>Database</Text>
            <Text style={styles.statusValue}>Online</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
            <Text style={styles.statusLabel}>API Services</Text>
            <Text style={styles.statusValue}>Online</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: CorporateTheme.colors.warning[500] }]} />
            </View>
            <Text style={styles.statusLabel}>WMS Module</Text>
            <Text style={styles.statusValue}>Degraded</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, { backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
            <Text style={styles.statusLabel}>TMS Module</Text>
            <Text style={styles.statusValue}>Online</Text>
          </View>
        </View>
      </CorporateCard>

      {/* System Alerts */}
      <CorporateCard title="System Alerts" variant="elevated" padding="md">
        <View style={styles.alerts}>
          {systemAlerts.map((alert) => (
            <TouchableOpacity key={alert.id} style={styles.alertItem}>
              <View style={styles.alertHeader}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
                <View style={styles.alertMeta}>
                  <Text style={styles.alertIcon}>
                    {getAlertIcon(alert.type)}
                  </Text>
                  <Text style={[styles.alertPriority, { color: getPriorityColor(alert.priority) }]}>
                    {alert.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.alertTimestamp}>{alert.timestamp}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </CorporateCard>

      {/* Quick Actions */}
      <CorporateCard title="Quick Actions" variant="elevated" padding="md">
        <View style={styles.quickActions}>
          <CorporateButton
            title="System Settings"
            onPress={() => {}}
            variant="primary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="User Management"
            onPress={() => {}}
            variant="secondary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="Reports"
            onPress={() => {}}
            variant="secondary"
            size="md"
            style={styles.quickActionButton}
          />
          <CorporateButton
            title="Backup System"
            onPress={() => {}}
            variant="warning"
            size="md"
            style={styles.quickActionButton}
          />
        </View>
      </CorporateCard>

      {/* Performance Metrics */}
      <CorporateCard title="Performance Metrics" variant="elevated" padding="md">
        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>System Uptime</Text>
            <Text style={styles.metricValue}>99.8%</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '99.8%', backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Response Time</Text>
            <Text style={styles.metricValue}>245ms</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '85%', backgroundColor: CorporateTheme.colors.primary[600] }]} />
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Error Rate</Text>
            <Text style={styles.metricValue}>0.2%</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '98%', backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
          </View>
        </View>
      </CorporateCard>

      {/* Recent Activity */}
      <CorporateCard title="Recent Activity" variant="elevated" padding="md">
        <View style={styles.activity}>
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>👤</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>New user registered</Text>
              <Text style={styles.activityDescription}>John Smith created an account</Text>
              <Text style={styles.activityTime}>5 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>📦</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Order completed</Text>
              <Text style={styles.activityDescription}>Order ORD-001 delivered successfully</Text>
              <Text style={styles.activityTime}>15 minutes ago</Text>
            </View>
          </View>
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>🚚</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Vehicle status updated</Text>
              <Text style={styles.activityDescription}>Vehicle VH-003 returned to depot</Text>
              <Text style={styles.activityTime}>30 minutes ago</Text>
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
  
  systemStatus: {
    gap: CorporateTheme.spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: CorporateTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.secondary[200],
  },
  statusIndicator: {
    marginRight: CorporateTheme.spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    flex: 1,
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[700],
  },
  statusValue: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
  },
  
  alerts: {
    gap: CorporateTheme.spacing.md,
  },
  alertItem: {
    backgroundColor: CorporateTheme.colors.secondary[50],
    borderRadius: CorporateTheme.borderRadius.md,
    padding: CorporateTheme.spacing.md,
    borderWidth: 1,
    borderColor: CorporateTheme.colors.secondary[200],
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: CorporateTheme.spacing.sm,
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  alertMessage: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  alertMeta: {
    alignItems: 'flex-end',
    marginLeft: CorporateTheme.spacing.sm,
  },
  alertIcon: {
    fontSize: 20,
    marginBottom: CorporateTheme.spacing.xs,
  },
  alertPriority: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
  },
  alertTimestamp: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[500],
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
  
  activity: {
    gap: CorporateTheme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: CorporateTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.secondary[200],
  },
  activityIcon: {
    fontSize: 24,
    marginRight: CorporateTheme.spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  activityDescription: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
    marginBottom: CorporateTheme.spacing.xs,
  },
  activityTime: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[500],
  },
});
