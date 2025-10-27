import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  Zap, 
  Database, 
  Globe, 
  User,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: 'threat' | 'suspicious' | 'failed_login' | 'xss' | 'sql_injection' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  ip: string;
  userAgent: string;
  description: string;
  blocked: boolean;
  source: string;
}

interface SecurityStats {
  totalThreats: number;
  blockedThreats: number;
  suspiciousActivity: number;
  failedLogins: number;
  xssAttempts: number;
  sqlInjectionAttempts: number;
  rateLimitHits: number;
  topThreatSources: Array<{ source: string; count: number }>;
  threatTrend: Array<{ date: string; count: number }>;
}

const SecurityMonitor: React.FC = () => {
  const [securityStats, setSecurityStats] = useState<SecurityStats>({
    totalThreats: 127,
    blockedThreats: 125,
    suspiciousActivity: 23,
    failedLogins: 45,
    xssAttempts: 8,
    sqlInjectionAttempts: 3,
    rateLimitHits: 156,
    topThreatSources: [
      { source: '192.168.1.100', count: 45 },
      { source: '10.0.0.50', count: 32 },
      { source: '172.16.0.25', count: 28 },
      { source: 'Unknown', count: 22 }
    ],
    threatTrend: [
      { date: '2024-01-01', count: 12 },
      { date: '2024-01-02', count: 18 },
      { date: '2024-01-03', count: 15 },
      { date: '2024-01-04', count: 22 },
      { date: '2024-01-05', count: 19 },
      { date: '2024-01-06', count: 25 },
      { date: '2024-01-07', count: 28 }
    ]
  });

  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([
    {
      id: '1',
      type: 'threat',
      severity: 'high',
      timestamp: new Date(),
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      description: 'Malicious payload detected in request body',
      blocked: true,
      source: 'External'
    },
    {
      id: '2',
      type: 'xss',
      severity: 'medium',
      timestamp: new Date(Date.now() - 300000),
      ip: '10.0.0.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      description: 'XSS attempt detected in form input',
      blocked: true,
      source: 'Web Form'
    },
    {
      id: '3',
      type: 'sql_injection',
      severity: 'critical',
      timestamp: new Date(Date.now() - 600000),
      ip: '172.16.0.25',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      description: 'SQL injection attempt in search query',
      blocked: true,
      source: 'Search API'
    },
    {
      id: '4',
      type: 'failed_login',
      severity: 'medium',
      timestamp: new Date(Date.now() - 900000),
      ip: '203.0.113.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      description: 'Multiple failed login attempts from same IP',
      blocked: false,
      source: 'Authentication'
    },
    {
      id: '5',
      type: 'rate_limit',
      severity: 'low',
      timestamp: new Date(Date.now() - 1200000),
      ip: '198.51.100.10',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      description: 'Rate limit exceeded for API endpoint',
      blocked: true,
      source: 'API Gateway'
    }
  ]);

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'critical': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'threat': return <Shield className="w-4 h-4 text-red-500" />;
      case 'suspicious': return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'failed_login': return <Lock className="w-4 h-4 text-orange-500" />;
      case 'xss': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'sql_injection': return <Database className="w-4 h-4 text-red-500" />;
      case 'rate_limit': return <Zap className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredEvents = securityEvents.filter(event => {
    if (filterSeverity !== 'all' && event.severity !== filterSeverity) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Güvenlik Monitörü</h1>
        <p className="text-gray-600">Gerçek zamanlı güvenlik izleme ve tehdit tespiti</p>
      </div>

      {/* Security Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-gray-900">Toplam Tehditler</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600 mb-2">{securityStats.totalThreats}</div>
          <p className="text-sm text-gray-600">Son 24 saat</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900">Engellenen</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-green-600 mb-2">{securityStats.blockedThreats}</div>
          <p className="text-sm text-gray-600">{Math.round((securityStats.blockedThreats / securityStats.totalThreats) * 100)}% başarı oranı</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900">Şüpheli</h3>
            </div>
            <TrendingDown className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 mb-2">{securityStats.suspiciousActivity}</div>
          <p className="text-sm text-gray-600">İnceleme gerekiyor</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Lock className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Başarısız Girişler</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-orange-600 mb-2">{securityStats.failedLogins}</div>
          <p className="text-sm text-gray-600">Potansiyel kaba kuvvet saldırısı</p>
        </div>
      </div>

      {/* Threat Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Tehdit Türleri</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">XSS Denemeleri</span>
              </div>
              <span className="font-semibold text-red-600">{securityStats.xssAttempts}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-red-500" />
                <span className="text-sm text-gray-600">SQL Enjeksiyonu</span>
              </div>
              <span className="font-semibold text-red-600">{securityStats.sqlInjectionAttempts}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Hız Sınırı Aşımları</span>
              </div>
              <span className="font-semibold text-blue-600">{securityStats.rateLimitHits}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">Başarısız Girişler</span>
              </div>
              <span className="font-semibold text-orange-600">{securityStats.failedLogins}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">En Çok Tehdit Kaynakları</h3>
          <div className="space-y-4">
            {securityStats.topThreatSources.map((source, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{source.source}</span>
                </div>
                <span className="font-semibold text-gray-900">{source.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
            </div>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Severity:</span>
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Security Events</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredEvents.map((event) => (
            <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getTypeIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                        {getSeverityIcon(event.severity)}
                        <span className="ml-1 capitalize">{event.severity}</span>
                      </span>
                      <span className="text-sm text-gray-500 capitalize">{event.type.replace('_', ' ')}</span>
                      {event.blocked && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{event.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>{event.ip}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{event.source}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{event.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecurityMonitor;
