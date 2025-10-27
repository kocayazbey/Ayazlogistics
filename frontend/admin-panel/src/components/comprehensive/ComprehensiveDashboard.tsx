import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Shield, 
  BarChart3, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users,
  Server,
  Database,
  Zap,
  TrendingUp,
  Globe,
  Lock,
  Monitor
} from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  requests: {
    total: number;
    success: number;
    error: number;
  };
}

interface SecurityMetrics {
  threatsBlocked: number;
  suspiciousActivity: number;
  failedLogins: number;
  xssAttempts: number;
  sqlInjectionAttempts: number;
  rateLimitHits: number;
}

interface AnalyticsData {
  business: {
    revenue: number;
    conversions: number;
    customers: number;
    orders: number;
  };
  technical: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    cacheHitRate: number;
  };
  user: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    engagement: number;
  };
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  userId: string;
  timestamp: Date;
  ip: string;
  status: 'success' | 'error' | 'warning';
  details: string;
}

const ComprehensiveDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: 99.9,
    memory: { used: 2.1, total: 8, percentage: 26.25 },
    cpu: { usage: 45, cores: 8 },
    requests: { total: 15420, success: 15200, error: 220 }
  });

  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    threatsBlocked: 127,
    suspiciousActivity: 23,
    failedLogins: 45,
    xssAttempts: 8,
    sqlInjectionAttempts: 3,
    rateLimitHits: 156
  });

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    business: { revenue: 125000, conversions: 89, customers: 1240, orders: 156 },
    technical: { responseTime: 245, throughput: 1200, errorRate: 1.2, cacheHitRate: 87.5 },
    user: { activeUsers: 890, newUsers: 45, sessions: 2340, engagement: 78.5 }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      action: 'LOGIN',
      resource: 'authentication',
      userId: 'user123',
      timestamp: new Date(),
      ip: '192.168.1.100',
      status: 'success',
      details: 'Successful login from Chrome browser'
    },
    {
      id: '2',
      action: 'CREATE',
      resource: 'order',
      userId: 'user456',
      timestamp: new Date(Date.now() - 300000),
      ip: '192.168.1.101',
      status: 'success',
      details: 'Order created successfully'
    },
    {
      id: '3',
      action: 'UPDATE',
      resource: 'inventory',
      userId: 'user789',
      timestamp: new Date(Date.now() - 600000),
      ip: '192.168.1.102',
      status: 'warning',
      details: 'Inventory updated with low stock alert'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'analytics' | 'audit'>('overview');

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setSystemHealth(prev => ({
        ...prev,
        requests: {
          total: prev.requests.total + Math.floor(Math.random() * 10),
          success: prev.requests.success + Math.floor(Math.random() * 8),
          error: prev.requests.error + Math.floor(Math.random() * 2)
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kapsamlı Dashboard</h1>
        <p className="text-gray-600">Gerçek zamanlı izleme, analitik ve güvenlik genel bakış</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: Monitor },
            { id: 'security', label: 'Güvenlik', icon: Shield },
            { id: 'analytics', label: 'Analitik', icon: BarChart3 },
            { id: 'audit', label: 'Denetim', icon: Eye }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* System Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Sistem Sağlığı</h3>
                </div>
                {getStatusIcon(systemHealth.status)}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="font-semibold text-green-600">{systemHealth.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Memory</span>
                  <span className="font-semibold">{systemHealth.memory.percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">CPU</span>
                  <span className="font-semibold">{systemHealth.cpu.usage}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-900">İstekler</h3>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total</span>
                  <span className="font-semibold">{systemHealth.requests.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Success</span>
                  <span className="font-semibold text-green-600">{systemHealth.requests.success.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Errors</span>
                  <span className="font-semibold text-red-600">{systemHealth.requests.error.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-gray-900">Güvenlik</h3>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Threats Blocked</span>
                  <span className="font-semibold text-red-600">{securityMetrics.threatsBlocked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Suspicious Activity</span>
                  <span className="font-semibold text-yellow-600">{securityMetrics.suspiciousActivity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Failed Logins</span>
                  <span className="font-semibold text-orange-600">{securityMetrics.failedLogins}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Kullanıcılar</h3>
                </div>
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Aktif</span>
                  <span className="font-semibold">{analyticsData.user.activeUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Bugün Yeni</span>
                  <span className="font-semibold text-green-600">{analyticsData.user.newUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Oturumlar</span>
                  <span className="font-semibold">{analyticsData.user.sessions}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Performans Metrikleri</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Yanıt Süresi</span>
                  <span className="font-semibold">{analyticsData.technical.responseTime}ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Verim</span>
                  <span className="font-semibold">{analyticsData.technical.throughput} req/s</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Önbellek İsabet Oranı</span>
                  <span className="font-semibold">{analyticsData.technical.cacheHitRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">İş Metrikleri</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gelir</span>
                  <span className="font-semibold">${analyticsData.business.revenue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Dönüşümler</span>
                  <span className="font-semibold">{analyticsData.business.conversions}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Müşteriler</span>
                  <span className="font-semibold">{analyticsData.business.customers}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Threats Blocked</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">{securityMetrics.threatsBlocked}</div>
              <p className="text-sm text-gray-600">Last 24 hours</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-gray-900">Suspicious Activity</h3>
              </div>
              <div className="text-3xl font-bold text-yellow-600 mb-2">{securityMetrics.suspiciousActivity}</div>
              <p className="text-sm text-gray-600">Requires attention</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Lock className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Failed Logins</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">{securityMetrics.failedLogins}</div>
              <p className="text-sm text-gray-600">Potential brute force</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">XSS Attempts</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">{securityMetrics.xssAttempts}</div>
              <p className="text-sm text-gray-600">Cross-site scripting</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">SQL Injection</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">{securityMetrics.sqlInjectionAttempts}</div>
              <p className="text-sm text-gray-600">Database attacks</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Rate Limit Hits</h3>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{securityMetrics.rateLimitHits}</div>
              <p className="text-sm text-gray-600">Request throttling</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Revenue</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">${analyticsData.business.revenue.toLocaleString()}</div>
              <p className="text-sm text-gray-600">+12% from last month</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Conversions</h3>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{analyticsData.business.conversions}</div>
              <p className="text-sm text-gray-600">+8% from last week</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Active Users</h3>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">{analyticsData.user.activeUsers}</div>
              <p className="text-sm text-gray-600">+15% from yesterday</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">Engagement</h3>
              </div>
              <div className="text-3xl font-bold text-orange-600 mb-2">{analyticsData.user.engagement}%</div>
              <p className="text-sm text-gray-600">+5% from last week</p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Recent Audit Logs</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-green-500' :
                        log.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900">{log.action} on {log.resource}</div>
                        <div className="text-sm text-gray-600">{log.details}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">{log.userId}</div>
                      <div className="text-sm text-gray-600">{log.ip}</div>
                      <div className="text-sm text-gray-500">{log.timestamp.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComprehensiveDashboard;
