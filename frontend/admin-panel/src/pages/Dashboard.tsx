import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Route, 
  Users, 
  Shield, 
  BarChart3, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  Brain,
  Zap,
  Target,
  Star,
  Globe,
  Database,
  Settings
} from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  activeOrders: number;
  totalRevenue: number;
  riskScore: number;
  efficiencyScore: number;
  customerSatisfaction: number;
  systemUptime: number;
  aiOptimizations: number;
}

interface RecentActivity {
  id: string;
  type: 'optimization' | 'alert' | 'analysis' | 'order' | 'risk' | 'customer';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
  value?: number;
  unit?: string;
}

interface SystemHealth {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Simulate API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalCustomers: 1250,
        activeOrders: 89,
        totalRevenue: 2500000,
        riskScore: 75,
        efficiencyScore: 88,
        customerSatisfaction: 92,
        systemUptime: 99.9,
        aiOptimizations: 156
      });

      setRecentActivity([
        {
          id: '1',
          type: 'optimization',
          title: 'Route Optimization Complete',
          description: 'AI optimized 15 delivery routes, saving 23% fuel costs',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          status: 'success',
          value: 23,
          unit: '%'
        },
        {
          id: '2',
          type: 'alert',
          title: 'High Risk Alert',
          description: 'Critical risk identified in warehouse operations',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          status: 'warning'
        },
        {
          id: '3',
          type: 'analysis',
          title: 'Inventory Analysis Ready',
          description: 'ABC/XYZ analysis completed for 500 products',
          timestamp: new Date(Date.now() - 30 * 60 * 1000),
          status: 'info'
        },
        {
          id: '4',
          type: 'customer',
          title: 'New Customer Segment',
          description: 'AI identified 25 new high-value customers',
          timestamp: new Date(Date.now() - 45 * 60 * 1000),
          status: 'success',
          value: 25,
          unit: 'customers'
        }
      ]);

      setSystemHealth([
        {
          component: 'AI Services',
          status: 'healthy',
          uptime: 99.9,
          responseTime: 120,
          lastCheck: new Date()
        },
        {
          component: 'Database',
          status: 'healthy',
          uptime: 99.8,
          responseTime: 45,
          lastCheck: new Date()
        },
        {
          component: 'API Gateway',
          status: 'warning',
          uptime: 98.5,
          responseTime: 200,
          lastCheck: new Date()
        },
        {
          component: 'Message Queue',
          status: 'healthy',
          uptime: 99.7,
          responseTime: 80,
          lastCheck: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to AyazLogistics Admin</h1>
            <p className="text-blue-100 text-lg">
              AI-powered logistics management platform
            </p>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats?.aiOptimizations}</div>
                <div className="text-sm text-blue-100">AI Optimizations Today</div>
              </div>
              <div className="w-px h-12 bg-blue-400"></div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats?.systemUptime}%</div>
                <div className="text-sm text-blue-100">System Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Customers</p>
                <p className="text-2xl font-bold text-blue-900">{stats?.totalCustomers.toLocaleString()}</p>
                <p className="text-sm text-blue-600">+12% from last month</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Orders</p>
                <p className="text-2xl font-bold text-green-900">{stats?.activeOrders}</p>
                <p className="text-sm text-green-600">In progress</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Revenue</p>
                <p className="text-2xl font-bold text-purple-900">₺{stats?.totalRevenue.toLocaleString()}</p>
                <p className="text-sm text-purple-600">This month</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-orange-900">{stats?.efficiencyScore}%</p>
                <p className="text-sm text-orange-600">AI optimized</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className={`p-2 rounded-full ${getStatusColor(activity.status)}`}>
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      {activity.value && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.value}{activity.unit}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Health */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>System Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemHealth.map((component, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{component.component}</span>
                      <Badge className={getHealthColor(component.status)}>
                        {component.status}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Uptime</span>
                        <span>{component.uptime}%</span>
                      </div>
                      <Progress value={component.uptime} className="h-1" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Response Time</span>
                        <span>{component.responseTime}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Quick Actions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700">
              <Brain className="h-6 w-6" />
              <span className="text-sm">Run AI Analysis</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2 bg-green-600 hover:bg-green-700">
              <Route className="h-6 w-6" />
              <span className="text-sm">Optimize Routes</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2 bg-purple-600 hover:bg-purple-700">
              <Package className="h-6 w-6" />
              <span className="text-sm">Inventory Analysis</span>
            </Button>
            <Button className="h-20 flex flex-col items-center justify-center space-y-2 bg-orange-600 hover:bg-orange-700">
              <Shield className="h-6 w-6" />
              <span className="text-sm">Risk Assessment</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Efficiency</span>
                <span className="font-semibold">{stats?.efficiencyScore}%</span>
              </div>
              <Progress value={stats?.efficiencyScore} className="h-2" />
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Customer Satisfaction</span>
                <span className="font-semibold">{stats?.customerSatisfaction}%</span>
              </div>
              <Progress value={stats?.customerSatisfaction} className="h-2" />
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Risk Score</span>
                <span className="font-semibold">{stats?.riskScore}%</span>
              </div>
              <Progress value={stats?.riskScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Global Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Worldwide Coverage</h3>
              <p className="text-gray-600 mb-4">Operations across 25 countries</p>
              <Button variant="outline" size="sm">
                View Map
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>System Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">All Systems</span>
                <Badge className="bg-green-100 text-green-800">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">AI Services</span>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Gateway</span>
                <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
