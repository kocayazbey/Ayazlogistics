import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Zap, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  RefreshCw,
  Settings,
  BarChart3,
  LineChart
} from 'lucide-react';

interface PerformanceMetrics {
  system: {
    uptime: number;
    loadAverage: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
      temperature: number;
    };
    disk: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  application: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeConnections: number;
    queueSize: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    cacheHitRate: number;
    lockWaits: number;
  };
  network: {
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
    latency: number;
    packetLoss: number;
    connections: number;
  };
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  source: string;
}

const PerformanceMonitor: React.FC = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    system: {
      uptime: 99.9,
      loadAverage: 1.2,
      memory: { used: 2.1, total: 8, percentage: 26.25 },
      cpu: { usage: 45, cores: 8, temperature: 65 },
      disk: { used: 120, total: 500, percentage: 24 }
    },
    application: {
      responseTime: 245,
      throughput: 1200,
      errorRate: 1.2,
      activeConnections: 156,
      queueSize: 23
    },
    database: {
      connections: 45,
      queries: 2340,
      slowQueries: 12,
      cacheHitRate: 87.5,
      lockWaits: 3
    },
    network: {
      bandwidth: { incoming: 45.2, outgoing: 23.8 },
      latency: 12,
      packetLoss: 0.1,
      connections: 89
    }
  });

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'High memory usage detected (85%)',
      timestamp: new Date(),
      resolved: false,
      source: 'System Monitor'
    },
    {
      id: '2',
      type: 'error',
      message: 'Database connection pool exhausted',
      timestamp: new Date(Date.now() - 300000),
      resolved: false,
      source: 'Database Monitor'
    },
    {
      id: '3',
      type: 'critical',
      message: 'Disk space critically low (95%)',
      timestamp: new Date(Date.now() - 600000),
      resolved: true,
      source: 'Storage Monitor'
    }
  ]);

  const [selectedView, setSelectedView] = useState<'overview' | 'system' | 'application' | 'database' | 'network'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Simulate real-time updates
        setPerformanceMetrics(prev => ({
          ...prev,
          application: {
            ...prev.application,
            responseTime: prev.application.responseTime + (Math.random() - 0.5) * 10,
            throughput: prev.application.throughput + (Math.random() - 0.5) * 50,
            activeConnections: prev.application.activeConnections + Math.floor((Math.random() - 0.5) * 5)
          }
        }));
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <XCircle className="w-4 h-4 text-red-500" />;
    if (value >= thresholds.warning) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Performans Monitörü</h1>
            <p className="text-gray-600">Gerçek zamanlı sistem ve uygulama performans izleme</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-700">Otomatik Yenileme</label>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Yenile</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Ayarlar</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'system', label: 'System', icon: Server },
            { id: 'application', label: 'Application', icon: Monitor },
            { id: 'database', label: 'Database', icon: Database },
            { id: 'network', label: 'Network', icon: Wifi }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setSelectedView(view.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                selectedView === view.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <view.icon className="w-4 h-4" />
              <span className="font-medium">{view.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">System Health</h3>
                </div>
                {getStatusIcon(performanceMetrics.system.memory.percentage, { warning: 80, critical: 90 })}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.system.uptime}%</div>
              <p className="text-sm text-gray-600">Uptime</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-900">Response Time</h3>
                </div>
                {getStatusIcon(performanceMetrics.application.responseTime, { warning: 500, critical: 1000 })}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.responseTime}ms</div>
              <p className="text-sm text-gray-600">Average</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Throughput</h3>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.throughput}</div>
              <p className="text-sm text-gray-600">req/s</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Error Rate</h3>
                </div>
                {getStatusIcon(performanceMetrics.application.errorRate, { warning: 2, critical: 5 })}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.errorRate}%</div>
              <p className="text-sm text-gray-600">Last hour</p>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Active Alerts</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {alerts.filter(alert => !alert.resolved).map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getAlertIcon(alert.type)}
                      <div>
                        <div className="font-medium text-gray-900">{alert.message}</div>
                        <div className="text-sm text-gray-600">{alert.source} • {alert.timestamp.toLocaleString()}</div>
                      </div>
                    </div>
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {selectedView === 'system' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Cpu className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">CPU Usage</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.system.cpu.usage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${performanceMetrics.system.cpu.usage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{performanceMetrics.system.cpu.cores} cores • {performanceMetrics.system.cpu.temperature}°C</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <HardDrive className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Memory</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.system.memory.percentage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${performanceMetrics.system.memory.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{performanceMetrics.system.memory.used}GB / {performanceMetrics.system.memory.total}GB</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Disk Usage</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.system.disk.percentage}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${performanceMetrics.system.disk.percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">{performanceMetrics.system.disk.used}GB / {performanceMetrics.system.disk.total}GB</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.system.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Load Average</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.system.loadAverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPU Cores</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.system.cpu.cores}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPU Temperature</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.system.cpu.temperature}°C</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Resource Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">CPU</span>
                    <span className="text-sm font-semibold text-gray-900">{performanceMetrics.system.cpu.usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${performanceMetrics.system.cpu.usage}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Memory</span>
                    <span className="text-sm font-semibold text-gray-900">{performanceMetrics.system.memory.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${performanceMetrics.system.memory.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Disk</span>
                    <span className="text-sm font-semibold text-gray-900">{performanceMetrics.system.disk.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ width: `${performanceMetrics.system.disk.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Tab */}
      {selectedView === 'application' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Response Time</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.responseTime}ms</div>
              <p className="text-sm text-gray-600">Average</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Throughput</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.throughput}</div>
              <p className="text-sm text-gray-600">req/s</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Error Rate</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.errorRate}%</div>
              <p className="text-sm text-gray-600">Last hour</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Active Connections</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.application.activeConnections}</div>
              <p className="text-sm text-gray-600">Current</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Application Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Queue Size</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.application.queueSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Connections</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.application.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.application.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Throughput</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.application.throughput} req/s</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Trends</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time Trend</span>
                  <div className="flex items-center space-x-1">
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">-5%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Throughput Trend</span>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+12%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Rate Trend</span>
                  <div className="flex items-center space-x-1">
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">-3%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Tab */}
      {selectedView === 'database' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Connections</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.database.connections}</div>
              <p className="text-sm text-gray-600">Active</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Queries</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.database.queries}</div>
              <p className="text-sm text-gray-600">Last hour</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-900">Slow Queries</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.database.slowQueries}</div>
              <p className="text-sm text-gray-600">>1s</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Cache Hit Rate</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.database.cacheHitRate}%</div>
              <p className="text-sm text-gray-600">Efficiency</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Database Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Connections</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.database.connections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Queries per Hour</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.database.queries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Slow Queries</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.database.slowQueries}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lock Waits</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.database.lockWaits}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Cache Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Hit Rate</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.database.cacheHitRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${performanceMetrics.database.cacheHitRate}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">Target: >80%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Tab */}
      {selectedView === 'network' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Wifi className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Bandwidth In</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.network.bandwidth.incoming} Mbps</div>
              <p className="text-sm text-gray-600">Incoming</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Bandwidth Out</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.network.bandwidth.outgoing} Mbps</div>
              <p className="text-sm text-gray-600">Outgoing</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Latency</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.network.latency}ms</div>
              <p className="text-sm text-gray-600">Average</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Connections</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{performanceMetrics.network.connections}</div>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Network Performance</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Latency</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.network.latency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Packet Loss</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.network.packetLoss}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Connections</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.network.connections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bandwidth In</span>
                  <span className="font-semibold text-gray-900">{performanceMetrics.network.bandwidth.incoming} Mbps</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Bandwidth Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Incoming</span>
                    <span className="text-sm font-semibold text-gray-900">{performanceMetrics.network.bandwidth.incoming} Mbps</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: '45%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Outgoing</span>
                    <span className="text-sm font-semibold text-gray-900">{performanceMetrics.network.bandwidth.outgoing} Mbps</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: '24%' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
