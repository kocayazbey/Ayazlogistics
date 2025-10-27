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

interface DashboardStats {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: string;
}

const dashboardStats: DashboardStats[] = [
  {
    title: 'Active Orders',
    value: '24',
    change: '+12%',
    changeType: 'positive',
    icon: '📦',
  },
  {
    title: 'Revenue',
    value: '$12.4K',
    change: '+8%',
    changeType: 'positive',
    icon: '💰',
  },
  {
    title: 'Deliveries',
    value: '18',
    change: '-2%',
    changeType: 'negative',
    icon: '🚚',
  },
  {
    title: 'Rating',
    value: '4.8',
    change: '+0.2',
    changeType: 'positive',
    icon: '⭐',
  },
];

interface RecentActivity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

const recentActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'delivery',
    message: 'Package delivered to John Smith',
    timestamp: '2 hours ago',
    status: 'success',
  },
  {
    id: '2',
    type: 'pickup',
    message: 'New pickup request from Acme Corp',
    timestamp: '4 hours ago',
    status: 'info',
  },
  {
    id: '3',
    type: 'route',
    message: 'Route optimization completed',
    timestamp: '6 hours ago',
    status: 'success',
  },
  {
    id: '4',
    type: 'alert',
    message: 'Low fuel warning for Vehicle #VH-003',
    timestamp: '8 hours ago',
    status: 'warning',
  },
];

export const CorporateDashboardScreen: React.FC = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return CorporateTheme.colors.accent[600];
      case 'warning':
        return CorporateTheme.colors.warning[500];
      case 'error':
        return CorporateTheme.colors.error[600];
      case 'info':
        return CorporateTheme.colors.primary[600];
      default:
        return CorporateTheme.colors.secondary[500];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'info':
        return 'ℹ️';
      default:
        return '📋';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Welcome back! Here's what's happening.</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {dashboardStats.map((stat, index) => (
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
                  <Text style={styles.statChangeLabel}>vs last week</Text>
                </View>
              </View>
            </View>
          </CorporateCard>
        ))}
      </View>

      {/* Quick Actions */}
      <CorporateCard title="Quick Actions" variant="elevated" padding="md">
        <View style={styles.quickActions}>
          <CorporateButton
            title="New Order"
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
            title="View Routes"
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
        </View>
      </CorporateCard>

      {/* Recent Activities */}
      <CorporateCard title="Recent Activities" variant="elevated" padding="md">
        <View style={styles.activities}>
          {recentActivities.map((activity) => (
            <TouchableOpacity key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.activityIconText}>
                  {getStatusIcon(activity.status)}
                </Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityMessage}>{activity.message}</Text>
                <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
              </View>
              <View style={[
                styles.activityStatus,
                { backgroundColor: getStatusColor(activity.status) }
              ]} />
            </TouchableOpacity>
          ))}
        </View>
      </CorporateCard>

      {/* Performance Metrics */}
      <CorporateCard title="Performance Metrics" variant="elevated" padding="md">
        <View style={styles.metrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>On-time Delivery</Text>
            <Text style={styles.metricValue}>94.2%</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '94.2%', backgroundColor: CorporateTheme.colors.accent[600] }]} />
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Customer Satisfaction</Text>
            <Text style={styles.metricValue}>4.8/5</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '96%', backgroundColor: CorporateTheme.colors.primary[600] }]} />
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Fuel Efficiency</Text>
            <Text style={styles.metricValue}>87.5%</Text>
            <View style={styles.metricBar}>
              <View style={[styles.metricBarFill, { width: '87.5%', backgroundColor: CorporateTheme.colors.warning[500] }]} />
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
  
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CorporateTheme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
    minWidth: (width - CorporateTheme.spacing.md * 3) / 2,
  },
  
  activities: {
    gap: CorporateTheme.spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: CorporateTheme.spacing.sm,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: CorporateTheme.borderRadius.full,
    backgroundColor: CorporateTheme.colors.secondary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: CorporateTheme.spacing.md,
  },
  activityIconText: {
    fontSize: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  activityTimestamp: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[500],
  },
  activityStatus: {
    width: 8,
    height: 8,
    borderRadius: CorporateTheme.borderRadius.full,
    marginLeft: CorporateTheme.spacing.sm,
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
