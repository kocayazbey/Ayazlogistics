'use client';

import React from 'react';
import Link from 'next/link';
import { Package, Plus, Eye, Edit, MapPin, Users } from 'lucide-react';

export default function WarehousesPage() {
  const stats = [
    { label: 'Toplam Depo', value: '8', change: '+1' },
    { label: 'Aktif Depo', value: '7', change: '+1' },
    { label: 'Toplam Alan', value: '40,000m²', change: '+5,000m²' },
    { label: 'Doluluk Oranı', value: '78%', change: '+5%' },
  ];

  const warehouses = [
    { name: 'İstanbul Merkez', location: 'İstanbul', capacity: '15,000m²', usage: '85%', status: 'Aktif' },
    { name: 'Ankara Depo', location: 'Ankara', capacity: '8,000m²', usage: '65%', status: 'Aktif' },
    { name: 'İzmir Depo', location: 'İzmir', capacity: '6,000m²', usage: '90%', status: 'Aktif' },
    { name: 'Bursa Depo', location: 'Bursa', capacity: '5,000m²', usage: '45%', status: 'Bakımda' },
  ];

  const quickActions = [
    { title: 'Yeni Depo', icon: Plus, href: '/warehouses/new', color: 'from-blue-600 to-cyan-500' },
    { title: 'Depo Listesi', icon: Package, href: '/warehouses', color: 'from-green-600 to-emerald-500' },
    { title: 'Konum Haritası', icon: MapPin, href: '/warehouses/map', color: 'from-purple-600 to-pink-500' },
    { title: 'Personel Yönetimi', icon: Users, href: '/warehouses/staff', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Depo Yönetimi</h1>
        <p className="text-gray-600">Depolarınızı yönetin ve optimize edin</p>
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

      {/* Warehouse List & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Depo Listesi</h3>
          <div className="space-y-4">
            {warehouses.map((warehouse, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    warehouse.status === 'Aktif' ? 'bg-green-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{warehouse.name}</p>
                    <p className="text-xs text-gray-500">{warehouse.location} • {warehouse.capacity}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{warehouse.usage}</p>
                  <p className="text-xs text-gray-500">{warehouse.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Depo Analizi</h3>
          <div className="space-y-4">
            {[
              { label: 'Ortalama Doluluk', value: '78%', progress: 78, color: 'bg-blue-500' },
              { label: 'Aktif Depo Oranı', value: '87%', progress: 87, color: 'bg-green-500' },
              { label: 'Kapasite Kullanımı', value: '65%', progress: 65, color: 'bg-purple-500' },
              { label: 'Günlük Hareket', value: '1,234', progress: 85, color: 'bg-orange-500' },
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