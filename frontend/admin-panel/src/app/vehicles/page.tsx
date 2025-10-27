'use client';

import React from 'react';
import Link from 'next/link';
import { Truck, Plus, Eye, Edit, Fuel, MapPin } from 'lucide-react';

export default function VehiclesPage() {
  const stats = [
    { label: 'Toplam Araç', value: '48', change: '+2' },
    { label: 'Aktif Araç', value: '42', change: '+5' },
    { label: 'Bakımda', value: '4', change: '-1' },
    { label: 'Ortalama Yakıt', value: '8.2L/100km', change: '-0.3L' },
  ];

  const vehicles = [
    { id: '34ABC123', driver: 'Ahmet Yılmaz', type: 'Kamyon', status: 'Aktif', location: 'İstanbul', fuel: '85%' },
    { id: '34DEF456', driver: 'Mehmet Kaya', type: 'Tır', status: 'Yolda', location: 'Ankara', fuel: '60%' },
    { id: '34GHI789', driver: 'Ali Demir', type: 'Kamyon', status: 'Aktif', location: 'İzmir', fuel: '90%' },
    { id: '34JKL012', driver: 'Veli Öz', type: 'Tır', status: 'Bakımda', location: 'Bursa', fuel: '45%' },
  ];

  const quickActions = [
    { title: 'Yeni Araç', icon: Plus, href: '/vehicles/new', color: 'from-blue-600 to-cyan-500' },
    { title: 'Araç Listesi', icon: Truck, href: '/vehicles', color: 'from-green-600 to-emerald-500' },
    { title: 'Yakıt Takibi', icon: Fuel, href: '/vehicles/fuel', color: 'from-purple-600 to-pink-500' },
    { title: 'Konum Takibi', icon: MapPin, href: '/vehicles/tracking', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Araç Yönetimi</h1>
        <p className="text-gray-600">Filonuzu yönetin ve takip edin</p>
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

      {/* Vehicle List & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Araç Listesi</h3>
          <div className="space-y-4">
            {vehicles.map((vehicle, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    vehicle.status === 'Aktif' ? 'bg-green-500' :
                    vehicle.status === 'Yolda' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vehicle.id}</p>
                    <p className="text-xs text-gray-500">{vehicle.driver} • {vehicle.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{vehicle.location}</p>
                  <p className="text-xs text-gray-500">{vehicle.fuel} yakıt</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Filo Analizi</h3>
          <div className="space-y-4">
            {[
              { label: 'Aktif Araç Oranı', value: '87%', progress: 87, color: 'bg-blue-500' },
              { label: 'Ortalama Yakıt Tüketimi', value: '8.2L/100km', progress: 82, color: 'bg-green-500' },
              { label: 'Bakım Gereken Araç', value: '4', progress: 20, color: 'bg-yellow-500' },
              { label: 'Günlük KM', value: '1,234km', progress: 75, color: 'bg-purple-500' },
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