'use client';

import { useState } from 'react';
import {
  MapPinIcon,
  TruckIcon,
  ClockIcon,
  FireIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function TrackingDashboard() {
  const [selectedShipment, setSelectedShipment] = useState(null);

  const stats = [
    { label: 'Aktif Gönderiler', value: '1,245', icon: TruckIcon, color: 'blue' },
    { label: 'Zamanında Teslimat', value: '94.5%', icon: CheckCircleIcon, color: 'green' },
    { label: 'Gecikmeli', value: '23', icon: ClockIcon, color: 'yellow' },
    { label: 'İstisnalar', value: '12', icon: ExclamationTriangleIcon, color: 'red' },
  ];

  const activeShipments = [
    {
      id: 'SHP-2024-001234',
      customer: 'ABC Lojistik',
      origin: 'Istanbul',
      destination: 'Ankara',
      status: 'in-transit',
      progress: 65,
      eta: '2 hours',
      temperature: '4°C',
      alerts: 0,
      driver: 'Mehmet Yılmaz',
      vehicle: '34 ABC 123'
    },
    {
      id: 'SHP-2024-001235',
      customer: 'XYZ Ticaret',
      origin: 'Izmir',
      destination: 'Bursa',
      status: 'delayed',
      progress: 45,
      eta: '4 hours (Delayed)',
      temperature: '22°C',
      alerts: 2,
      driver: 'Ayşe Demir',
      vehicle: '35 XYZ 456'
    },
    {
      id: 'SHP-2024-001236',
      customer: 'DEF Kargo',
      origin: 'Ankara',
      destination: 'Antalya',
      status: 'on-schedule',
      progress: 85,
      eta: '45 min',
      temperature: '18°C',
      alerts: 0,
      driver: 'Ali Kaya',
      vehicle: '06 DEF 789'
    },
  ];

  const iotSensors = [
    { type: 'Temperature', value: '4°C', status: 'normal', range: '2-8°C', icon: FireIcon },
    { type: 'Humidity', value: '45%', status: 'normal', range: '40-60%', icon: FireIcon },
    { type: 'Shock', value: 'No events', status: 'normal', range: '<2G', icon: BellAlertIcon },
    { type: 'Location', value: 'On route', status: 'normal', range: 'GPS Active', icon: MapPinIcon },
  ];

  const recentAlerts = [
    { time: '10 min ago', type: 'Temperature', message: 'SHP-001235: Temperature above threshold (9°C)', severity: 'high' },
    { time: '25 min ago', type: 'Delay', message: 'SHP-001235: Estimated delay of 2 hours', severity: 'medium' },
    { time: '1 hour ago', type: 'Route', message: 'SHP-001234: Route deviation detected', severity: 'low' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Gerçek Zamanlı Takip ve İzleme</h1>
              <p className="mt-1 text-sm text-gray-500">IoT (Nesnelerin İnterneti) sensör entegrasyonu ile canlı gönderi görünürlüğü</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-6 py-2 bg-white border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all">
                <MapPinIcon className="w-5 h-5 inline-block mr-2" />
                Harita Görünümü
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-200">
                Gönderi Takip Et
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Active Shipments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Aktif Gönderiler</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activeShipments.map((shipment) => (
              <div key={shipment.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <TruckIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{shipment.id}</h3>
                      <p className="text-sm text-gray-500">{shipment.customer}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                      shipment.status === 'on-schedule' ? 'bg-green-100 text-green-700' :
                      shipment.status === 'in-transit' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {shipment.status.replace('-', ' ').toUpperCase()}
                    </span>
                    {shipment.alerts > 0 && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                        {shipment.alerts} Alerts
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Route</p>
                    <p className="text-sm font-semibold text-gray-900">{shipment.origin} → {shipment.destination}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">ETA</p>
                    <p className="text-sm font-semibold text-gray-900">{shipment.eta}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Driver / Vehicle</p>
                    <p className="text-sm font-semibold text-gray-900">{shipment.driver} / {shipment.vehicle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Temperature</p>
                    <p className="text-sm font-semibold text-gray-900">{shipment.temperature}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-semibold text-gray-900">{shipment.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${
                        shipment.status === 'delayed' ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${shipment.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* IoT Sensors */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">IoT (Nesnelerin İnterneti) Sensör İzleme</h2>
            <div className="grid grid-cols-2 gap-4">
              {iotSensors.map((sensor, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <sensor.icon className="w-8 h-8 text-blue-600" />
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">{sensor.type}</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{sensor.value}</p>
                  <p className="text-xs text-gray-500">Range: {sensor.range}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Son Uyarılar ve İstisnalar</h2>
            <div className="space-y-4">
              {recentAlerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-xl border-l-4 ${
                  alert.severity === 'high' ? 'bg-red-50 border-red-500' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.type}
                    </span>
                    <span className="text-xs text-gray-500">{alert.time}</span>
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
