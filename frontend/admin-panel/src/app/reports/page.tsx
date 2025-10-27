'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, FileText, Download, TrendingUp, Calendar, Filter } from 'lucide-react';

export default function ReportsPage() {
  const stats = [
    { label: 'Toplam Rapor', value: '45', change: '+8' },
    { label: 'Bu Ay Oluşturulan', value: '12', change: '+3' },
    { label: 'Otomatik Rapor', value: '8', change: '+2' },
    { label: 'İndirilen Rapor', value: '234', change: '+45' },
  ];

  const recentReports = [
    { name: 'Aylık Satış Raporu', type: 'Satış', date: '2025-01-15', size: '2.4 MB', downloads: '23' },
    { name: 'Depo Performans Raporu', type: 'WMS', date: '2025-01-14', size: '1.8 MB', downloads: '15' },
    { name: 'Taşıma Maliyet Analizi', type: 'TMS', date: '2025-01-13', size: '3.2 MB', downloads: '31' },
    { name: 'Müşteri Analizi', type: 'CRM', date: '2025-01-12', size: '1.5 MB', downloads: '18' },
  ];

  const quickActions = [
    { title: 'Yeni Rapor', icon: FileText, href: '/reports/new', color: 'from-blue-600 to-cyan-500' },
    { title: 'Rapor Listesi', icon: BarChart3, href: '/reports', color: 'from-green-600 to-emerald-500' },
    { title: 'Otomatik Raporlar', icon: Calendar, href: '/reports/automated', color: 'from-purple-600 to-pink-500' },
    { title: 'Rapor Şablonları', icon: TrendingUp, href: '/reports/templates', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Raporlama Sistemi</h1>
        <p className="text-gray-600">Detaylı raporlar oluşturun ve analiz edin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-purple-500 to-pink-500',
            'from-orange-500 to-red-500'
          ];
          
          return (
            <div 
              key={stat.label} 
              className={`bg-gradient-to-br ${gradients[idx]} rounded-2xl p-6 text-white shadow-lg`}
            >
              <p className="text-sm opacity-90 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm opacity-90">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">Hızlı erişim</p>
                </div>
                <action.icon className="h-8 w-8" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Reports & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Son Raporlar</h3>
          <div className="space-y-4">
            {recentReports.map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.name}</p>
                    <p className="text-xs text-gray-500">{report.type} • {report.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{report.size}</p>
                  <p className="text-xs text-gray-500">{report.downloads} indirme</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Rapor Analizi</h3>
          <div className="space-y-4">
            {[
              { label: 'En Popüler Rapor', value: 'Satış Raporu', progress: 85, color: 'bg-blue-500' },
              { label: 'Ortalama İndirme', value: '22', progress: 75, color: 'bg-green-500' },
              { label: 'Otomatik Rapor Oranı', value: '18%', progress: 18, color: 'bg-purple-500' },
              { label: 'Rapor Kullanımı', value: '94%', progress: 94, color: 'bg-orange-500' },
            ].map((metric, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                  <span className="text-sm font-bold text-gray-900">{metric.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${metric.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}