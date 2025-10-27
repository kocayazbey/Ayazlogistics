'use client';

import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Map, Clock, Route, Package, Users } from 'lucide-react';

export default function LogisticsPage() {
  const stats = [
    { label: 'Active Vehicles', value: '24', change: '+3' },
    { label: 'Total Routes', value: '156', change: '+12' },
    { label: 'Active Deliveries', value: '89', change: '+15' },
    { label: 'Drivers Online', value: '18', change: '+2' },
  ];

  const quickActions = [
    { 
      title: 'Vehicles', 
      description: 'Fleet management and vehicle tracking',
      icon: Truck, 
      href: '/logistics/vehicles', 
      color: 'from-blue-600 to-cyan-500' 
    },
    { 
      title: 'Routes', 
      description: 'Route planning and optimization',
      icon: Map, 
      href: '/logistics/routes', 
      color: 'from-green-600 to-emerald-500' 
    },
    { 
      title: 'Tracking', 
      description: 'Real-time shipment tracking',
      icon: Clock, 
      href: '/logistics/tracking', 
      color: 'from-purple-600 to-pink-500' 
    },
  ];

  const recentActivities = [
    { action: 'Vehicle dispatched', item: 'Truck #001 to Route A', time: '5 minutes ago', type: 'vehicle' },
    { action: 'Route optimized', item: 'Route B-15 updated', time: '15 minutes ago', type: 'route' },
    { action: 'Delivery completed', item: 'Shipment #12345', time: '1 hour ago', type: 'delivery' },
    { action: 'Driver assigned', item: 'John Doe to Truck #003', time: '2 hours ago', type: 'driver' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Logistics Management</h1>
        <p className="text-gray-600">Comprehensive transportation and delivery management</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Logistics Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <action.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivities.map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'vehicle' ? 'bg-blue-500' :
                  activity.type === 'route' ? 'bg-green-500' :
                  activity.type === 'delivery' ? 'bg-purple-500' :
                  'bg-orange-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.item}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">{activity.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
