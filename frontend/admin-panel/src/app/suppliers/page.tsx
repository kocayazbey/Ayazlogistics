'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Wrench, Package, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { suppliersApi } from '../../lib/api/suppliers.api';

export default function SuppliersPage() {
  const [stats, setStats] = useState([
    { label: 'Active Suppliers', value: '0', change: '+0' },
    { label: 'Pending Orders', value: '0', change: '+0' },
    { label: 'Sync Status', value: '0%', change: '+0%' },
    { label: 'Total Value', value: '₺0', change: '+0%' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSupplierData();
  }, []);

  const loadSupplierData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, syncHistoryResponse] = await Promise.all([
        suppliersApi.getSupplierOrders({ status: 'pending' }).catch(() => ({ data: [] })),
        suppliersApi.getSyncHistory().catch(() => ({ data: [] }))
      ]);

      const pendingOrders = ordersResponse.data?.length || 0;
      const syncHistory = syncHistoryResponse.data || [];
      const successfulSyncs = syncHistory.filter((s: any) => s.status === 'success').length;
      const syncRate = syncHistory.length > 0 ? Math.round((successfulSyncs / syncHistory.length) * 100) : 0;

      setStats([
        { label: 'Active Suppliers', value: String(ordersResponse.data?.length || 0), change: '+0' },
        { label: 'Pending Orders', value: String(pendingOrders), change: '+0' },
        { label: 'Sync Status', value: `${syncRate}%`, change: '+0%' },
        { label: 'Total Value', value: '₺0', change: '+0%' },
      ]);
    } catch (error) {
      console.error('Error loading supplier data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      title: 'Orders', 
      description: 'Manage supplier orders and purchase requests',
      icon: ShoppingCart, 
      href: '/suppliers/orders', 
      color: 'from-blue-600 to-cyan-500' 
    },
    { 
      title: 'Stock Sync', 
      description: 'Synchronize inventory with suppliers',
      icon: Wrench, 
      href: '/suppliers/sync', 
      color: 'from-green-600 to-emerald-500' 
    },
  ];

  const recentActivities = [
    { action: 'New order created', item: 'PO-2025-001 from Supplier A', time: '5 minutes ago', type: 'order' },
    { action: 'Stock synced', item: 'Supplier B inventory updated', time: '15 minutes ago', type: 'sync' },
    { action: 'Order received', item: 'PO-2025-002 delivered', time: '1 hour ago', type: 'delivery' },
    { action: 'Sync failed', item: 'Supplier C connection error', time: '2 hours ago', type: 'error' },
  ];

  const topSuppliers = [
    { name: 'Supplier A', orders: 45, value: '₺850K', status: 'active', rating: 4.8 },
    { name: 'Supplier B', orders: 38, value: '₺720K', status: 'active', rating: 4.6 },
    { name: 'Supplier C', orders: 32, value: '₺650K', status: 'active', rating: 4.4 },
    { name: 'Supplier D', orders: 28, value: '₺580K', status: 'inactive', rating: 4.2 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Suppliers Management</h1>
        <p className="text-gray-600">Manage supplier relationships and procurement processes</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Supplier Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.type === 'order' ? 'bg-blue-500' :
                    activity.type === 'sync' ? 'bg-green-500' :
                    activity.type === 'delivery' ? 'bg-purple-500' :
                    'bg-red-500'
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

        {/* Top Suppliers */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Top Suppliers</h3>
          <div className="space-y-4">
            {topSuppliers.map((supplier, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    supplier.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{supplier.name}</p>
                    <p className="text-xs text-gray-500">{supplier.orders} orders • {supplier.value}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">{supplier.rating}</span>
                    <span className="text-xs text-gray-500 ml-1">★</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
