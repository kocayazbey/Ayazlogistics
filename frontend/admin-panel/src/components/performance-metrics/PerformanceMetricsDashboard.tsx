import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Activity,
  Brain,
  Zap,
  Eye,
  Download,
  Filter,
  Settings,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  PieChart,
  LineChart
} from 'lucide-react';

interface KPI {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'customer' | 'employee' | 'quality' | 'innovation' | 'sustainability';
  currentValue: number;
  targetValue: number;
  previousValue: number;
  changePercentage: number;
  trendDirection: 'improving' | 'declining' | 'stable' | 'volatile';
  status: string;
  unit: string;
  frequency: string;
  owner: string;
  stakeholders: string[];
  lastUpdated: Date;
}

interface PerformanceMetrics {
  efficiency: {
    overall: number;
    byDepartment: Array<{
      department: string;
      score: number;
      trend: string;
    }>;
  };
  productivity: {
    overall: number;
    byTeam: Array<{
      team: string;
      score: number;
      trend: string;
    }>;
  };
  quality: {
    overall: number;
    byProcess: Array<{
      process: string;
      score: number;
      trend: string;
    }>;
  };
  cost: {
    overall: number;
    byCategory: Array<{
      category: string;
      amount: number;
      trend: string;
    }>;
  };
  customerSatisfaction: {
    overall: number;
    bySegment: Array<{
      segment: string;
      score: number;
      trend: string;
    }>;
  };
  financial: {
    revenue: number;
    profit: number;
    margin: number;
    trend: string;
  };
  operational: {
    throughput: number;
    utilization: number;
    availability: number;
    trend: string;
  };
}

interface PerformanceAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  description: string;
  metric: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  timestamp: Date;
  acknowledgedBy: string;
  acknowledgedAt: Date;
  resolvedBy: string;
  resolvedAt: Date;
  resolution: string;
  actions: string[];
}

const PerformanceMetricsDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(30);

  useEffect(() => {
    fetchKPIs();
    fetchPerformanceMetrics();
    fetchAlerts();
  }, [selectedCategory, timeRange]);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/analytics/performance-metrics/kpis?category=${selectedCategory}&timeRange=${timeRange}`);
      const data = await response.json();
      setKpis(data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/analytics/performance-metrics/metrics?timeRange=${timeRange}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/v1/analytics/performance-metrics/alerts');
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      'financial': 'bg-green-100 text-green-800',
      'operational': 'bg-blue-100 text-blue-800',
      'customer': 'bg-purple-100 text-purple-800',
      'employee': 'bg-orange-100 text-orange-800',
      'quality': 'bg-yellow-100 text-yellow-800',
      'innovation': 'bg-pink-100 text-pink-800',
      'sustainability': 'bg-teal-100 text-teal-800'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      case 'stable': return 'text-blue-600';
      case 'volatile': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-600" />;
      case 'volatile': return <Zap className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Metrics & Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive performance monitoring and analysis</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Generate Report</span>
          </Button>
          <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
            <Zap className="h-4 w-4" />
            <span>Create KPI</span>
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Efficiency Score</p>
                <p className="text-2xl font-bold text-blue-900">{metrics?.efficiency.overall || 0}%</p>
                <p className="text-sm text-blue-600">Overall operational efficiency</p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Productivity Score</p>
                <p className="text-2xl font-bold text-green-900">{metrics?.productivity.overall || 0}%</p>
                <p className="text-sm text-green-600">Team productivity metrics</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Quality Score</p>
                <p className="text-2xl font-bold text-purple-900">{metrics?.quality.overall || 0}%</p>
                <p className="text-sm text-purple-600">Process quality metrics</p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-orange-900">{metrics?.customerSatisfaction.overall || 0}%</p>
                <p className="text-sm text-orange-600">Customer satisfaction rating</p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="kpis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Key Performance Indicators</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpis.map((kpi) => (
                  <div key={kpi.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Target className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{kpi.name}</h3>
                          <p className="text-sm text-gray-600">{kpi.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getCategoryColor(kpi.category)}>
                          {kpi.category}
                        </Badge>
                        <Badge variant="outline">
                          {kpi.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Current Value</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold">{kpi.currentValue}</span>
                          <span className="text-sm text-gray-500">{kpi.unit}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {getTrendIcon(kpi.trendDirection)}
                          <span className={`text-sm font-medium ${getTrendColor(kpi.trendDirection)}`}>
                            {kpi.changePercentage > 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Target Value</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold">{kpi.targetValue}</span>
                          <span className="text-sm text-gray-500">{kpi.unit}</span>
                        </div>
                        <div className="mt-2">
                          <Progress 
                            value={(kpi.currentValue / kpi.targetValue) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Previous Value</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold">{kpi.previousValue}</span>
                          <span className="text-sm text-gray-500">{kpi.unit}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Last updated: {new Date(kpi.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Performance</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl font-bold">
                            {((kpi.currentValue / kpi.targetValue) * 100).toFixed(0)}%
                          </span>
                          <span className="text-sm text-gray-500">of target</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Owner: {kpi.owner}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          <Button size="sm" variant="outline">
                            <Settings className="h-3 w-3 mr-1" />
                            Configure
                          </Button>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Track
                          </Button>
                        </div>
                        <div className="text-sm text-gray-500">
                          Frequency: {kpi.frequency}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Metrics Tab */}
        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Efficiency Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Efficiency Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-blue-900">{metrics?.efficiency.overall || 0}%</h3>
                    <p className="text-sm text-blue-600">Overall Efficiency</p>
                  </div>
                  <div className="space-y-2">
                    {metrics?.efficiency.byDepartment.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={dept.score} className="w-20 h-2" />
                          <span className="text-sm font-semibold">{dept.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productivity Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Productivity Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-green-900">{metrics?.productivity.overall || 0}%</h3>
                    <p className="text-sm text-green-600">Overall Productivity</p>
                  </div>
                  <div className="space-y-2">
                    {metrics?.productivity.byTeam.map((team, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{team.team}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={team.score} className="w-20 h-2" />
                          <span className="text-sm font-semibold">{team.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quality Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="h-5 w-5" />
                  <span>Quality Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <h3 className="text-2xl font-bold text-purple-900">{metrics?.quality.overall || 0}%</h3>
                    <p className="text-sm text-purple-600">Overall Quality</p>
                  </div>
                  <div className="space-y-2">
                    {metrics?.quality.byProcess.map((process, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{process.process}</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={process.score} className="w-20 h-2" />
                          <span className="text-sm font-semibold">{process.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Financial Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <h4 className="text-lg font-bold text-green-900">₺{metrics?.financial.revenue?.toLocaleString() || 0}</h4>
                      <p className="text-sm text-green-600">Revenue</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-lg font-bold text-blue-900">₺{metrics?.financial.profit?.toLocaleString() || 0}</h4>
                      <p className="text-sm text-blue-600">Profit</p>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <h4 className="text-lg font-bold text-purple-900">{metrics?.financial.margin || 0}%</h4>
                    <p className="text-sm text-purple-600">Profit Margin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Performance Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getSeverityColor(alert.severity)}`}></div>
                        <h3 className="font-semibold text-lg">{alert.message}</h3>
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge className={getStatusColor(alert.status)}>
                        {alert.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <p className="text-gray-600 text-sm mb-3">{alert.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Alert Type</p>
                        <p className="font-semibold">{alert.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Metric</p>
                        <p className="font-semibold">{alert.metric}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Timestamp</p>
                        <p className="font-semibold">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    {alert.actions.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Recommended Actions:</p>
                        <div className="flex flex-wrap gap-1">
                          {alert.actions.map((action, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                        {alert.status === 'open' && (
                          <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Activity className="h-3 w-3 mr-1" />
                            Resolve
                          </Button>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {alert.acknowledgedBy && `Acknowledged by: ${alert.acknowledgedBy}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-gray-600 mb-4">Comprehensive performance analysis and insights</p>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Generate Analytics Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMetricsDashboard;
