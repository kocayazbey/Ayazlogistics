'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Route, Truck, Users, MapPin, Clock, Fuel } from 'lucide-react';

interface TMSStats {
  activeVehicles: number;
  todayRoutes: number;
  averageTime: string;
  fuelConsumption: string;
}

interface Vehicle {
  id: string;
  driver: string;
  route: string;
  status: string;
  eta: string;
}

export default function TMSPage() {
  const [stats, setStats] = useState<TMSStats>({
    activeVehicles: 0,
    todayRoutes: 0,
    averageTime: '0h',
    fuelConsumption: '0L'
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTMSData();
  }, []);

  const loadTMSData = async () => {
    try {
      setLoading(true);
      
      // Fetch TMS stats from API
      const statsResponse = await fetch('/api/tms/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch vehicles data from API
      const vehiclesResponse = await fetch('/api/tms/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading TMS data:', error);
      // Fallback to default values
      setStats({
        activeVehicles: 0,
        todayRoutes: 0,
        averageTime: '0h',
        fuelConsumption: '0L'
      });
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Yeni Rota', icon: Route, href: '/tms/routes', color: 'from-blue-600 to-cyan-500' },
    { title: 'Araç Atama', icon: Truck, href: '/tms/vehicles', color: 'from-green-600 to-emerald-500' },
    { title: 'Sürücü Yönetimi', icon: Users, href: '/tms/drivers', color: 'from-purple-600 to-pink-500' },
    { title: 'Canlı Takip', icon: MapPin, href: '/tms/tracking', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">TMS - Taşıma Yönetim Sistemi</h1>
        <p className="text-gray-600">Taşıma operasyonlarınızı optimize edin ve takip edin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-gray-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 rounded mb-1"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          ))
        ) : (
          [
            { label: 'Aktif Araç', value: stats.activeVehicles.toString(), change: '+3' },
            { label: 'Bugünkü Rota', value: stats.todayRoutes.toString(), change: '+12%' },
            { label: 'Ortalama Süre', value: stats.averageTime, change: '-15%' },
            { label: 'Yakıt Tüketimi', value: stats.fuelConsumption, change: '+5%' },
          ].map((stat, idx) => {
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
          })
        )}
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

      {/* Fleet Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Filo Durumu</h3>
          <div className="space-y-4">
            {vehicles.map((vehicle, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    vehicle.status === 'Yolda' ? 'bg-green-500' :
                    vehicle.status === 'Müsait' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vehicle.id}</p>
                    <p className="text-xs text-gray-500">{vehicle.driver}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{vehicle.route}</p>
                  <p className="text-xs text-gray-500">{vehicle.status} • {vehicle.eta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Performans Metrikleri</h3>
          <div className="space-y-4">
            {[
              { label: 'Ortalama Teslimat Süresi', value: '2.4 saat', progress: 85 },
              { label: 'Yakıt Verimliliği', value: '8.2 L/100km', progress: 92 },
              { label: 'Müşteri Memnuniyeti', value: '4.8/5', progress: 96 },
              { label: 'Araç Kullanım Oranı', value: '78%', progress: 78 },
            ].map((metric, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                  <span className="text-sm font-bold text-gray-900">{metric.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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