'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Truck, Users, BarChart3, Settings, Plus } from 'lucide-react';
import { t } from '@/lib/i18n';
import { wms } from '@/lib/api';

export default function WMSPage() {
  const [stats, setStats] = useState([
    { label: t('wms.inventory.summary.totalItems'), value: '0', change: '+0%' },
    { label: t('wms.operations.summary.inProgress'), value: '0', change: '+0%' },
    { label: t('wms.navigation.warehouseStatus'), value: '0%', change: '+0%' },
    { label: t('wms.shipping.title'), value: '0', change: '+0%' },
  ]);
  const [warehouseStatus, setWarehouseStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWMSData();
  }, []);

  const loadWMSData = async () => {
    try {
      setLoading(true);
      
      // Fetch WMS data from API
      const [inventoryResponse, operationsResponse, zonesResponse] = await Promise.allSettled([
        wms.inventory.getStats(),
        wms.operations.getStats(),
        wms.inventory.getAll({ includeZones: true })
      ]);

      // Update stats
      if (inventoryResponse.status === 'fulfilled') {
        const inventoryData = inventoryResponse.value.data;
        setStats(prev => [
          { ...prev[0], value: inventoryData.totalItems?.toLocaleString() || '0' },
          { ...prev[1], value: operationsResponse.status === 'fulfilled' ? operationsResponse.value.data.inProgressOperations?.toString() || '0' : '0' },
          { ...prev[2], value: `${inventoryData.utilizationRate || 0}%` },
          { ...prev[3], value: inventoryData.totalShipments?.toLocaleString() || '0' }
        ]);
      }

      // Update warehouse status
      if (zonesResponse.status === 'fulfilled') {
        const zonesData = zonesResponse.value.data;
        setWarehouseStatus(
          zonesData.map((zone: any) => ({
            name: zone.name,
            capacity: zone.utilizationRate || 0,
            status: zone.utilizationRate > 80 ? 'Dolu' : zone.utilizationRate > 50 ? 'Orta' : 'Boş'
          }))
        );
      }
    } catch (error) {
      console.error('Error loading WMS data:', error);
      // Fallback to mock data
      setStats([
        { label: t('wms.inventory.summary.totalItems'), value: '12,456', change: '+5.2%' },
        { label: t('wms.operations.summary.inProgress'), value: '234', change: '+12%' },
        { label: t('wms.navigation.warehouseStatus'), value: '78%', change: '+3%' },
        { label: t('wms.shipping.title'), value: '1,234', change: '+8%' },
      ]);
      setWarehouseStatus([
        { name: 'A Blok', capacity: 85, status: 'Dolu' },
        { name: 'B Blok', capacity: 60, status: 'Orta' },
        { name: 'C Blok', capacity: 30, status: 'Boş' },
        { name: 'D Blok', capacity: 90, status: 'Dolu' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: t('wms.receiving.title'), icon: Package, href: '/wms/receiving', color: 'from-blue-600 to-cyan-500' },
    { title: t('wms.shipping.title'), icon: Truck, href: '/wms/shipping', color: 'from-green-600 to-emerald-500' },
    { title: t('wms.inventory.title'), icon: BarChart3, href: '/wms/inventory', color: 'from-purple-600 to-pink-500' },
    { title: t('wms.picking.title'), icon: Users, href: '/wms/picking', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('wms.title')}</h1>
        <p className="text-gray-600">{t('wms.subtitle')}</p>
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
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('wms.navigation.quickActions')}</h2>
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
                  <p className="text-sm opacity-90">{t('wms.navigation.quickAccess')}</p>
                </div>
                <action.icon className="h-8 w-8" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('wms.navigation.recentActivities')}</h3>
          <div className="space-y-4">
            {[
              { text: t('wms.inventory.addItem') + ' tamamlandı', time: '2 dakika önce', type: 'success' },
              { text: t('wms.shipping.title') + ' hazırlandı - Sipariş #1234', time: '15 dakika önce', type: 'info' },
              { text: t('wms.inventory.title') + ' başlatıldı', time: '1 saat önce', type: 'warning' },
              { text: t('wms.picking.title') + ' tamamlandı', time: '2 saat önce', type: 'success' },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'warning' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t('wms.navigation.warehouseStatus')}</h3>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading warehouse status...</div>
            ) : warehouseStatus.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No warehouse data available</div>
            ) : (
              warehouseStatus.map((block, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{block.name}</p>
                  <p className="text-xs text-gray-500">{block.status}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        block.capacity > 80 ? 'bg-red-500' :
                        block.capacity > 50 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${block.capacity}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">{block.capacity}%</span>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}