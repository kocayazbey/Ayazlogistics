'use client';

import React from 'react';
import { CloudIcon, TruckIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function CarbonTracking() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Karbon Emisyon Takibi</h1>
          <p className="text-gray-600">Çevresel etkinizi izleyin ve azaltın (ESG (Çevresel, Sosyal, Yönetişim) Uyumu)</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: CloudIcon, label: 'Bu Ay Toplam CO₂', value: '1,250 kg', trend: '-20%', color: 'blue' },
            { icon: TruckIcon, label: 'KM Başına CO₂', value: '0.5 kg', trend: '-15%', color: 'green' },
            { icon: ChartBarIcon, label: 'Hedef Başarısı', value: '80%', trend: '+12%', color: 'purple' },
            { icon: SparklesIcon, label: 'Karbon Kredileri', value: '450', trend: '+25', color: 'yellow' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                  <span className="text-sm font-medium text-green-600">{stat.trend}</span>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Emissions by Vehicle Type */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Araç Tipine Göre Emisyonlar</h2>
          <div className="space-y-4">
            {[
              { type: 'Diesel Trucks', emissions: 850, percentage: 68 },
              { type: 'Electric Vehicles', emissions: 50, percentage: 4 },
              { type: 'Hybrid Vehicles', emissions: 200, percentage: 16 },
              { type: 'Gasoline Vans', emissions: 150, percentage: 12 },
            ].map((vehicle) => (
              <div key={vehicle.type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-700 font-medium">{vehicle.type}</span>
                  <span className="text-gray-900 font-bold">{vehicle.emissions} kg CO₂</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                    style={{ width: `${vehicle.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reduction Initiatives */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Karbon Azaltma Girişimleri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { initiative: 'Route Optimization', impact: '-15% emissions', status: 'Active' },
              { initiative: 'EV Fleet Expansion', impact: '-25% emissions', status: 'In Progress' },
              { initiative: 'Green Warehousing', impact: '-10% emissions', status: 'Active' },
              { initiative: 'Carbon Offset Program', impact: 'Neutral 500kg', status: 'Active' },
            ].map((item) => (
              <div key={item.initiative} className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.initiative}</h3>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs rounded-full">{item.status}</span>
                </div>
                <p className="text-green-700 font-medium">{item.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

