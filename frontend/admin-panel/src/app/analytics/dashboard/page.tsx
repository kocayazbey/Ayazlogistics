'use client';

import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Package,
  Truck,
  DollarSign,
  Target,
  Activity,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

export default function AnalyticsDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30-days');
  const [selectedMetric, setSelectedMetric] = useState('all');

  const kpiMetrics = [
    {
      name: 'Toplam Gelir',
      value: '₺2.45M',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      name: 'Aktif Müşteriler',
      value: '156',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      name: 'Tamamlanan Siparişler',
      value: '1,234',
      change: '+15.3%',
      trend: 'up',
      icon: Package,
      color: 'text-purple-600'
    },
    {
      name: 'Aktif Araçlar',
      value: '48',
      change: '+2',
      trend: 'up',
      icon: Truck,
      color: 'text-orange-600'
    }
  ];

  const revenueData = [
    { month: 'Ocak', revenue: 2200000, orders: 890, customers: 142 },
    { month: 'Şubat', revenue: 2350000, orders: 920, customers: 148 },
    { month: 'Mart', revenue: 2450000, orders: 1050, customers: 156 },
    { month: 'Nisan', revenue: 2500000, orders: 1100, customers: 162 },
    { month: 'Mayıs', revenue: 2600000, orders: 1150, customers: 168 },
    { month: 'Haziran', revenue: 2700000, orders: 1234, customers: 175 }
  ];

  const topCustomers = [
    { name: 'ABC Teknoloji A.Ş.', revenue: 450000, orders: 45, growth: '+15%' },
    { name: 'XYZ Lojistik Ltd.', revenue: 380000, orders: 38, growth: '+8%' },
    { name: 'DEF Gıda San.', revenue: 320000, orders: 32, growth: '+22%' },
    { name: 'GHI İnşaat Ltd.', revenue: 280000, orders: 28, growth: '+5%' },
    { name: 'JKL Otomotiv', revenue: 250000, orders: 25, growth: '+12%' }
  ];

  const performanceMetrics = [
    {
      category: 'WMS Performansı',
      metric: 'Ortalama İşlem Süresi',
      value: '12.5 dk',
      target: '10 dk',
      status: 'warning',
      change: '+5%'
    },
    {
      category: 'TMS Performansı',
      metric: 'Zamanında Teslimat',
      value: '94%',
      target: '95%',
      status: 'good',
      change: '+2%'
    },
    {
      category: 'Müşteri Memnuniyeti',
      metric: 'NPS Skoru',
      value: '8.2',
      target: '8.5',
      status: 'good',
      change: '+0.3'
    },
    {
      category: 'Operasyonel Verimlilik',
      metric: 'Araç Kullanım Oranı',
      value: '87%',
      target: '90%',
      status: 'warning',
      change: '+3%'
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analitik Dashboard</h1>
          <p className="text-gray-600">İş performansını analiz edin ve raporlayın</p>
        </div>

        {/* Period and Filter Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '7-days' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => setSelectedPeriod('7-days')}
              >
                7 Gün
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '30-days' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => setSelectedPeriod('30-days')}
              >
                30 Gün
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '90-days' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => setSelectedPeriod('90-days')}
              >
                90 Gün
              </button>
            </div>
            <div className="flex gap-2 ml-auto">
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Rapor İndir
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiMetrics.map((kpi, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <kpi.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center text-sm ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                  {kpi.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
              <div className="text-sm text-gray-600">{kpi.name}</div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Gelir Trendi</h2>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                Son 6 Ay
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Gelir grafiği</p>
                <p className="text-sm text-gray-400">Chart.js entegrasyonu</p>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Performans Metrikleri</h2>
            <div className="space-y-4">
              {performanceMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{metric.metric}</div>
                    <div className="text-xs text-gray-500">{metric.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                    <div className="text-xs text-gray-500">Hedef: {metric.target}</div>
                  </div>
                  <div className="ml-4">
                    <div className={`text-lg ${getStatusColor(metric.status)}`}>
                      {getStatusIcon(metric.status)}
                    </div>
                    <div className="text-xs text-gray-500">{metric.change}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">En İyi Müşteriler</h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      <div className="text-xs text-gray-500">{customer.orders} sipariş</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₺{customer.revenue.toLocaleString()}</div>
                    <div className={`text-xs ${customer.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {customer.growth}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Operasyonel Verimlilik</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Depo Kullanımı</span>
                <span className="text-sm font-medium">85%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Araç Verimliliği</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">İşlem Süresi</span>
                <span className="text-sm font-medium">12.5 dk</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Müşteri Analizi</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Yeni Müşteriler</span>
                <span className="text-sm font-medium">23</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Kayıp Müşteriler</span>
                <span className="text-sm font-medium">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Net Büyüme</span>
                <span className="text-sm font-medium text-green-600">+18</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Finansal Özet</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Toplam Gelir</span>
                <span className="text-sm font-medium">₺2.45M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Toplam Gider</span>
                <span className="text-sm font-medium">₺1.8M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Net Kar</span>
                <span className="text-sm font-medium text-green-600">₺650K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
