'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Zap,
  Database,
  Server,
  Globe,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

export default function PerformanceMetricsPage() {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [timeRange, setTimeRange] = useState('24h');

  const performanceMetrics = {
    overview: {
      responseTime: { current: 85, average: 78, target: 100 },
      throughput: { current: 1250, average: 1180, target: 1000 },
      errorRate: { current: 0.2, average: 0.3, target: 1.0 },
      uptime: { current: 99.9, average: 99.8, target: 99.5 }
    },
    database: {
      queryTime: { current: 35, average: 32, target: 50 },
      connections: { current: 45, average: 42, target: 100 },
      cacheHitRate: { current: 87, average: 85, target: 80 },
      slowQueries: { current: 3, average: 5, target: 10 }
    },
    api: {
      avgResponseTime: { current: 120, average: 115, target: 200 },
      requestsPerSecond: { current: 450, average: 420, target: 500 },
      errorRate: { current: 0.1, average: 0.2, target: 1.0 },
      timeoutRate: { current: 0.05, average: 0.08, target: 0.5 }
    }
  };

  const systemMetrics = [
    {
      name: 'CPU Kullanımı',
      value: '45%',
      change: '+5%',
      trend: 'up',
      status: 'good',
      icon: Activity,
      color: 'text-green-600'
    },
    {
      name: 'Bellek Kullanımı',
      value: '68%',
      change: '+2%',
      trend: 'up',
      status: 'good',
      icon: Database,
      color: 'text-blue-600'
    },
    {
      name: 'Disk Kullanımı',
      value: '78%',
      change: '+8%',
      trend: 'up',
      status: 'warning',
      icon: Server,
      color: 'text-yellow-600'
    },
    {
      name: 'Ağ Trafiği',
      value: '2.4 GB/s',
      change: '+12%',
      trend: 'up',
      status: 'good',
      icon: Globe,
      color: 'text-purple-600'
    }
  ];

  const performanceHistory = [
    { time: '00:00', responseTime: 80, throughput: 1000, errorRate: 0.1 },
    { time: '04:00', responseTime: 75, throughput: 800, errorRate: 0.05 },
    { time: '08:00', responseTime: 90, throughput: 1200, errorRate: 0.2 },
    { time: '12:00', responseTime: 95, throughput: 1500, errorRate: 0.3 },
    { time: '16:00', responseTime: 85, throughput: 1300, errorRate: 0.15 },
    { time: '20:00', responseTime: 70, throughput: 1100, errorRate: 0.1 }
  ];

  const slowQueries = [
    {
      query: 'SELECT * FROM orders WHERE status = ?',
      avgTime: 250,
      count: 45,
      lastExecuted: '2024-01-27 14:30:25'
    },
    {
      query: 'SELECT * FROM inventory WHERE warehouse_id = ?',
      avgTime: 180,
      count: 32,
      lastExecuted: '2024-01-27 14:25:10'
    },
    {
      query: 'SELECT * FROM customers WHERE created_at > ?',
      avgTime: 150,
      count: 28,
      lastExecuted: '2024-01-27 14:20:15'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return '✓';
      case 'warning':
        return '⚠';
      case 'critical':
        return '⚠';
      default:
        return '○';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Performans Metrikleri</h1>
          <p className="text-gray-600">Sistem performansını izleyin ve analiz edin</p>
        </div>

        {/* Time Range Selector */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex gap-2">
              {['1h', '24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === range ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="flex gap-2 ml-auto">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Rapor İndir
              </button>
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {systemMetrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <metric.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${metric.trend === 'down' ? 'rotate-180' : ''}`} />
                  {metric.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-600 mb-2">{metric.name}</div>
              <div className={`flex items-center text-sm ${getStatusColor(metric.status)}`}>
                <span className="mr-1">{getStatusIcon(metric.status)}</span>
                {metric.status === 'good' ? 'İyi' : metric.status === 'warning' ? 'Uyarı' : 'Kritik'}
              </div>
            </div>
          ))}
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Genel Performans</h2>
            <div className="space-y-4">
              {Object.entries(performanceMetrics.overview).map(([key, metric]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xs text-gray-500">Hedef: {metric.target}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{metric.current}</div>
                    <div className="text-xs text-gray-500">Ortalama: {metric.average}</div>
                  </div>
                  <div className="ml-4">
                    <div className={`text-lg ${metric.current <= metric.target ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.current <= metric.target ? '✓' : '⚠'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Veritabanı Performansı</h2>
            <div className="space-y-4">
              {Object.entries(performanceMetrics.database).map(([key, metric]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-xs text-gray-500">Hedef: {metric.target}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{metric.current}</div>
                    <div className="text-xs text-gray-500">Ortalama: {metric.average}</div>
                  </div>
                  <div className="ml-4">
                    <div className={`text-lg ${metric.current <= metric.target ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.current <= metric.target ? '✓' : '⚠'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performans Trendi</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Performans grafiği</p>
              <p className="text-sm text-gray-400">Chart.js entegrasyonu</p>
            </div>
          </div>
        </div>

        {/* Slow Queries */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Yavaş Sorgular</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sorgu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ortalama Süre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Çalıştırma Sayısı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Çalıştırma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slowQueries.map((query, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm text-gray-900 max-w-xs truncate">
                        {query.query}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{query.avgTime}ms</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {query.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {query.lastExecuted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                          <Activity className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                          <Zap className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Performance Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Optimizasyon Önerileri</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Veritabanı İndeksleri</div>
                  <div className="text-xs text-gray-600">orders tablosuna status kolonu için indeks ekleyin</div>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Cache Optimizasyonu</div>
                  <div className="text-xs text-gray-600">Sık kullanılan sorgular için Redis cache ekleyin</div>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">API Optimizasyonu</div>
                  <div className="text-xs text-gray-600">API yanıt sürelerini iyileştirmek için pagination ekleyin</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sistem Durumu</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Sunucu Durumu</span>
                <span className="text-sm font-medium text-green-600">Çevrimiçi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Veritabanı Durumu</span>
                <span className="text-sm font-medium text-green-600">Çevrimiçi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cache Durumu</span>
                <span className="text-sm font-medium text-green-600">Çevrimiçi</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Gateway</span>
                <span className="text-sm font-medium text-green-600">Çevrimiçi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
