import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Server, 
  Database, 
  Globe,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface Metric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  status: 'good' | 'warning' | 'critical';
  icon: React.ComponentType<any>;
  color: string;
}

interface RealTimeData {
  timestamp: Date;
  metrics: Metric[];
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

const RealTimeMetrics: React.FC = () => {
  const [realTimeData, setRealTimeData] = useState<RealTimeData>({
    timestamp: new Date(),
    metrics: [
      {
        id: 'response_time',
        name: 'Response Time',
        value: 245,
        unit: 'ms',
        trend: 'down',
        change: -5.2,
        status: 'good',
        icon: Clock,
        color: 'text-blue-500'
      },
      {
        id: 'throughput',
        name: 'Throughput',
        value: 1200,
        unit: 'req/s',
        trend: 'up',
        change: 12.3,
        status: 'good',
        icon: Zap,
        color: 'text-green-500'
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        value: 1.2,
        unit: '%',
        trend: 'down',
        change: -0.8,
        status: 'good',
        icon: AlertTriangle,
        color: 'text-red-500'
      },
      {
        id: 'active_users',
        name: 'Active Users',
        value: 890,
        unit: '',
        trend: 'up',
        change: 8.5,
        status: 'good',
        icon: Users,
        color: 'text-purple-500'
      },
      {
        id: 'cpu_usage',
        name: 'CPU Usage',
        value: 45,
        unit: '%',
        trend: 'stable',
        change: 0.2,
        status: 'good',
        icon: Server,
        color: 'text-orange-500'
      },
      {
        id: 'memory_usage',
        name: 'Memory Usage',
        value: 68,
        unit: '%',
        trend: 'up',
        change: 2.1,
        status: 'warning',
        icon: Database,
        color: 'text-yellow-500'
      },
      {
        id: 'revenue',
        name: 'Revenue',
        value: 125000,
        unit: '$',
        trend: 'up',
        change: 15.7,
        status: 'good',
        icon: DollarSign,
        color: 'text-green-500'
      },
      {
        id: 'conversions',
        name: 'Conversions',
        value: 89,
        unit: '',
        trend: 'up',
        change: 22.1,
        status: 'good',
        icon: TrendingUp,
        color: 'text-blue-500'
      }
    ],
    alerts: [
      {
        id: '1',
        type: 'warning',
        message: 'High memory usage detected (85%)',
        timestamp: new Date()
      },
      {
        id: '2',
        type: 'info',
        message: 'New user registration spike detected',
        timestamp: new Date(Date.now() - 300000)
      },
      {
        id: '3',
        type: 'error',
        message: 'Database connection pool exhausted',
        timestamp: new Date(Date.now() - 600000)
      }
    ]
  });

  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time data updates
      setRealTimeData(prev => ({
        timestamp: new Date(),
        metrics: prev.metrics.map(metric => ({
          ...metric,
          value: metric.value + (Math.random() - 0.5) * (metric.unit === '%' ? 2 : metric.unit === 'ms' ? 10 : metric.unit === 'req/s' ? 50 : 5),
          change: metric.change + (Math.random() - 0.5) * 2,
          trend: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down' | 'stable'
        })),
        alerts: prev.alerts
      }));
      setLastUpdate(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Real-Time Metrics</h1>
            <p className="text-gray-600">Live system performance and business metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {realTimeData.metrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
                <h3 className="font-semibold text-gray-900">{metric.name}</h3>
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <span className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {metric.unit === '$' ? `$${metric.value.toLocaleString()}` : 
               metric.unit === '%' ? `${metric.value.toFixed(1)}%` :
               metric.value.toLocaleString()}
              {metric.unit && metric.unit !== '$' && metric.unit !== '%' && (
                <span className="text-lg text-gray-500 ml-1">{metric.unit}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                metric.status === 'good' ? 'bg-green-500' :
                metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600 capitalize">{metric.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Response Time Trend</h3>
          <div className="h-64 flex items-end space-x-1">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-500 rounded-t"
                style={{ 
                  height: `${Math.random() * 100}%`,
                  minHeight: '4px'
                }}
              ></div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>5 minutes ago</span>
            <span>Now</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Throughput Trend</h3>
          <div className="h-64 flex items-end space-x-1">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="flex-1 bg-green-500 rounded-t"
                style={{ 
                  height: `${Math.random() * 100}%`,
                  minHeight: '4px'
                }}
              ></div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>5 minutes ago</span>
            <span>Now</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Real-Time Alerts</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {realTimeData.alerts.map((alert) => (
            <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <div className="font-medium text-gray-900">{alert.message}</div>
                    <div className="text-sm text-gray-600">{alert.timestamp.toLocaleString()}</div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertColor(alert.type)}`}>
                  {alert.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Server className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">System Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Server</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Database</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cache</span>
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-900">Network Status</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Latency</span>
              <span className="text-sm font-semibold text-gray-900">12ms</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Bandwidth</span>
              <span className="text-sm font-semibold text-gray-900">45.2 Mbps</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Packet Loss</span>
              <span className="text-sm font-semibold text-gray-900">0.1%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Activity className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900">Performance</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Uptime</span>
              <span className="text-sm font-semibold text-gray-900">99.9%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="text-sm font-semibold text-gray-900">1.2%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cache Hit</span>
              <span className="text-sm font-semibold text-gray-900">87.5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMetrics;
