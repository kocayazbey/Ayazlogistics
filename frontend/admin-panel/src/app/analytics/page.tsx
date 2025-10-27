'use client';

import { useState } from 'react';
import {
  ChartBarIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  CpuChipIcon,
  TruckIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState('week');

  const kpiCards = [
    { title: 'Depo Verimliliği', value: '94.2%', change: '+5.3%', trend: 'up', icon: BuildingOfficeIcon },
    { title: 'Filo Kullanım Oranı', value: '87.5%', change: '+2.1%', trend: 'up', icon: TruckIcon },
    { title: 'İşgücü Verimliliği', value: '425 UPH (Birim/Saat)', change: '+12.8%', trend: 'up', icon: UsersIcon },
    { title: 'Ekipman Çalışma Süresi', value: '96.8%', change: '-1.2%', trend: 'down', icon: CubeIcon },
  ];

  const warehouseMetrics = [
    { metric: 'Mal Kabul Verimliliği', value: '98.5%', target: '95%', status: 'excellent' },
    { metric: 'Toplama Doğruluğu', value: '99.2%', target: '99%', status: 'excellent' },
    { metric: 'Zamanında Sevkiyat', value: '94.1%', target: '95%', status: 'good' },
    { metric: 'Envanter Doğruluğu', value: '97.8%', target: '98%', status: 'good' },
    { metric: 'Sipariş Karşılama Oranı', value: '96.5%', target: '97%', status: 'good' },
    { metric: 'Rampa Kullanım Oranı', value: '82.3%', target: '85%', status: 'warning' },
  ];

  const fleetData = [
    { vehicle: 'Fleet A (Heavy)', utilization: 92, mileage: '125,450 km', efficiency: 'Excellent', maintenance: 'Due in 2 days' },
    { vehicle: 'Fleet B (Medium)', utilization: 85, mileage: '98,230 km', efficiency: 'Good', maintenance: 'Completed' },
    { vehicle: 'Fleet C (Light)', utilization: 78, mileage: '67,890 km', efficiency: 'Good', maintenance: 'Due next week' },
  ];

  const predictiveInsights = [
    {
      title: 'Demand Forecast',
      prediction: 'Expected 15% increase in volume next month',
      confidence: 92,
      recommendation: 'Consider increasing staff by 3 FTE',
      impact: 'High'
    },
    {
      title: 'Equipment Maintenance',
      prediction: 'Forklift #12 likely to need service in 5 days',
      confidence: 87,
      recommendation: 'Schedule preventive maintenance',
      impact: 'Medium'
    },
    {
      title: 'Route Optimization',
      prediction: 'Alternative route can save 12% fuel cost',
      confidence: 95,
      recommendation: 'Implement new routing algorithm',
      impact: 'High'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Gelişmiş Analitik ve Öngörüler</h1>
              <p className="mt-1 text-sm text-gray-500">AI (Yapay Zeka) destekli tahminlerle gerçek zamanlı gösterge panelleri</p>
            </div>
            <div className="flex items-center space-x-3">
              <select 
                value={timeRange}
                onChange={(e: any) => setTimeRange(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              >
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
                <option value="quarter">Bu Çeyrek</option>
              </select>
              <button className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200">
                <CpuChipIcon className="w-5 h-5 inline-block mr-2" />
                AI (Yapay Zeka) Öngörüleri
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpiCards.map((kpi, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-purple-100 rounded-xl flex items-center justify-center">
                  <kpi.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <span className={`text-sm font-semibold ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {kpi.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</h3>
              <p className="text-sm text-gray-500">{kpi.title}</p>
            </div>
          ))}
        </div>

        {/* Predictive Insights */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center mb-6">
            <CpuChipIcon className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">AI (Yapay Zeka) Destekli Tahmin Öngörüleri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {predictiveInsights.map((insight, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">{insight.title}</h3>
                  <span className="px-3 py-1 bg-white/20 rounded-lg text-xs font-semibold">
                    {insight.confidence}% confidence
                  </span>
                </div>
                <p className="text-sm mb-4 text-white/90">{insight.prediction}</p>
                <div className="p-3 bg-white/20 rounded-lg mb-3">
                  <p className="text-xs font-medium mb-1">Recommendation:</p>
                  <p className="text-sm">{insight.recommendation}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  insight.impact === 'High' ? 'bg-red-500/30' : 'bg-yellow-500/30'
                }`}>
                  {insight.impact} Impact
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Warehouse Metrics */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Depo Verimlilik Metrikleri</h2>
              <BuildingOfficeIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              {warehouseMetrics.map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{metric.metric}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                      <span className="text-xs text-gray-500">/ {metric.target}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metric.status === 'excellent' ? 'bg-green-500' :
                        metric.status === 'good' ? 'bg-blue-500' :
                        'bg-yellow-500'
                      }`}
                      style={{ width: metric.value }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fleet Utilization */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Filo Kullanım Metrikleri</h2>
              <TruckIcon className="w-6 h-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              {fleetData.map((fleet, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">{fleet.vehicle}</h3>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      fleet.efficiency === 'Excellent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {fleet.efficiency}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Kullanım</p>
                      <p className="font-semibold text-gray-900">{fleet.utilization}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Kilometre</p>
                      <p className="font-semibold text-gray-900">{fleet.mileage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Bakım</p>
                      <p className="font-semibold text-gray-900 text-xs">{fleet.maintenance}</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 bg-indigo-500 rounded-full" style={{ width: `${fleet.utilization}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Report Builder CTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <PresentationChartLineIcon className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Özel Rapor Oluşturucu</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Sürükle-bırak aracımızla özel raporlar oluşturun. Otomatik gönderim planlayın ve birden fazla formata aktarın.
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all">
            Özel Rapor Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}
