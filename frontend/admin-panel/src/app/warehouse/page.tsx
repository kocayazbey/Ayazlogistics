'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, ClipboardList, Building2, Wrench } from 'lucide-react';
import { warehouseApi } from '../../lib/api/warehouse.api';

export default function WarehousePage() {
  const [stats, setStats] = useState([
    { label: 'Toplam Stok', value: '0', change: '+0' },
    { label: 'Aktif Lot', value: '0', change: '+0' },
    { label: 'Raf Sayısı', value: '0', change: '+0' },
    { label: 'Terminal', value: '0', change: '+0' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWarehouseData();
  }, []);

  const loadWarehouseData = async () => {
    try {
      setLoading(true);
      const [inventoryResponse, lotsResponse, warehousesResponse] = await Promise.all([
        warehouseApi.getInventoryStats().catch(() => ({ data: {} })),
        warehouseApi.getLotStats().catch(() => ({ data: {} })),
        warehouseApi.getWarehouses().catch(() => ({ data: [] }))
      ]);

      const inventoryStats = inventoryResponse.data || {};
      const lotStats = lotsResponse.data || {};
      const warehouses = warehousesResponse.data || [];

      setStats([
        { label: 'Toplam Stok', value: String(inventoryStats.totalItems || 0), change: '+0' },
        { label: 'Aktif Lot', value: String(lotStats.activeLots || 0), change: '+0' },
        { label: 'Raf Sayısı', value: String(inventoryStats.totalLocations || 0), change: '+0' },
        { label: 'Terminal', value: String(warehouses.length || 0), change: '+0' },
      ]);
    } catch (error) {
      console.error('Error loading warehouse data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      title: 'Stocks', 
      description: 'Stok yönetimi ve envanter takibi',
      icon: Package, 
      href: '/warehouse/stocks', 
      color: 'from-blue-600 to-cyan-500' 
    },
    { 
      title: 'Lots & Batches', 
      description: 'Lot ve parti yönetimi',
      icon: ClipboardList, 
      href: '/warehouse/lots', 
      color: 'from-green-600 to-emerald-500' 
    },
    { 
      title: 'Shelves', 
      description: 'Raf ve konum yönetimi',
      icon: Building2, 
      href: '/warehouse/shelves', 
      color: 'from-purple-600 to-pink-500' 
    },
    { 
      title: 'Handheld Devices', 
      description: 'El terminali yönetimi',
      icon: Wrench, 
      href: '/warehouse/terminals', 
      color: 'from-orange-600 to-red-500' 
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Warehouse Management</h1>
        <p className="text-gray-600">Comprehensive warehouse operations and inventory management</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Warehouse Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          {[
            { action: 'New stock received', item: 'Product ABC-123', time: '2 minutes ago', type: 'stock' },
            { action: 'Lot created', item: 'LOT-2025-001', time: '15 minutes ago', type: 'lot' },
            { action: 'Shelf updated', item: 'Shelf A-01-02', time: '1 hour ago', type: 'shelf' },
            { action: 'Terminal synced', item: 'Device WH-001', time: '2 hours ago', type: 'terminal' },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'stock' ? 'bg-blue-500' :
                  activity.type === 'lot' ? 'bg-green-500' :
                  activity.type === 'shelf' ? 'bg-purple-500' :
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
