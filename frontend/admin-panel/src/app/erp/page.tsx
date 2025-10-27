'use client';

import React from 'react';
import Link from 'next/link';
import { Database, Users, DollarSign, FileText, TrendingUp, Settings } from 'lucide-react';

export default function ERPPage() {
  const stats = [
    { label: 'Toplam Gelir', value: '₺12.4M', change: '+8.2%' },
    { label: 'Aktif Proje', value: '23', change: '+3' },
    { label: 'Çalışan Sayısı', value: '156', change: '+5' },
    { label: 'Sistem Kullanımı', value: '94%', change: '+2%' },
  ];

  const modules = [
    { name: 'Muhasebe', icon: DollarSign, href: '/erp/accounting', description: 'Finansal işlemler ve raporlama', status: 'Aktif' },
    { name: 'İnsan Kaynakları', icon: Users, href: '/erp/hr', description: 'Personel yönetimi ve bordro', status: 'Aktif' },
    { name: 'Satın Alma', icon: FileText, href: '/erp/procurement', description: 'Tedarik zinciri yönetimi', status: 'Aktif' },
    { name: 'Proje Yönetimi', icon: TrendingUp, href: '/erp/projects', description: 'Proje takibi ve planlama', status: 'Aktif' },
  ];

  const quickActions = [
    { title: 'Muhasebe', icon: DollarSign, href: '/erp/accounting', color: 'from-blue-600 to-cyan-500' },
    { title: 'İnsan Kaynakları', icon: Users, href: '/erp/hr', color: 'from-green-600 to-emerald-500' },
    { title: 'Satın Alma', icon: FileText, href: '/erp/procurement', color: 'from-purple-600 to-pink-500' },
    { title: 'Proje Yönetimi', icon: TrendingUp, href: '/erp/projects', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ERP - Kurumsal Kaynak Planlama</h1>
        <p className="text-gray-600">Kurumsal süreçlerinizi entegre edin ve optimize edin</p>
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

      {/* ERP Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">ERP Modülleri</h3>
          <div className="space-y-4">
            {modules.map((module, idx) => (
              <Link
                key={idx}
                href={module.href}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <module.icon className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{module.name}</p>
                    <p className="text-xs text-gray-500">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">{module.status}</span>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Sistem Durumu</h3>
          <div className="space-y-4">
            {[
              { label: 'Veritabanı Bağlantısı', status: 'Aktif', color: 'bg-green-500' },
              { label: 'API Servisleri', status: 'Aktif', color: 'bg-green-500' },
              { label: 'Yedekleme', status: 'Tamamlandı', color: 'bg-green-500' },
              { label: 'Güvenlik', status: 'Güncel', color: 'bg-green-500' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.status}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}