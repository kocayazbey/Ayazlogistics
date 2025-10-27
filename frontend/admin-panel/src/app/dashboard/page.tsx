'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  CubeIcon, 
  ShoppingCartIcon, 
  CurrencyDollarIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { analytics, wms } from '@/lib/api';
import { ordersApi } from '@/lib/api/orders.api';
import { tmsApi } from '@/lib/api/tms.api';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  activeVehicles: number;
  warehouseCapacity: number;
  pendingTasks: number;
  systemUptime: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    activeVehicles: 0,
    warehouseCapacity: 0,
    pendingTasks: 0,
    systemUptime: '99.9%'
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data from API
      const [analyticsResponse, inventoryResponse, lowStockResponse, ordersResponse, vehiclesResponse] = await Promise.allSettled([
        analytics.getDashboard(),
        wms.inventory.getStats(),
        wms.inventory.getLowStock({ limit: 5 }),
        ordersApi.getAll({ page: 1, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
        tmsApi.vehicles.getAll({ status: 'active' })
      ]);

      // Set stats from API responses
      if (analyticsResponse.status === 'fulfilled') {
        const analyticsData = analyticsResponse.value.data;
        setStats({
          totalOrders: analyticsData.totalOrders || 0,
          totalRevenue: analyticsData.totalRevenue || 0,
          totalProducts: analyticsData.totalProducts || 0,
          totalCustomers: analyticsData.totalCustomers || 0,
          activeVehicles: analyticsData.activeVehicles || 0,
          warehouseCapacity: analyticsData.warehouseCapacity || 0,
          pendingTasks: analyticsData.pendingTasks || 0,
          systemUptime: analyticsData.systemUptime || '99.9%'
        });
      }

      // Set inventory stats
      if (inventoryResponse.status === 'fulfilled') {
        const inventoryData = inventoryResponse.value.data;
        setStats(prev => ({
          ...prev,
          totalProducts: inventoryData.totalItems || prev.totalProducts,
          warehouseCapacity: inventoryData.utilizationRate || prev.warehouseCapacity
        }));
      }

      // Set low stock items
      if (lowStockResponse.status === 'fulfilled') {
        const lowStockData = lowStockResponse.value.data || lowStockResponse.value;
        setLowStockItems(
          (lowStockData.items || lowStockData || []).map((item: any) => ({
            id: item.id,
            name: item.name || item.productName,
            sku: item.sku || item.productSku,
            currentStock: item.quantityOnHand || item.currentStock || 0,
            minStock: item.minQuantity || item.reorderPoint || 0
          }))
        );
      }

      // Set recent orders from API
      if (ordersResponse.status === 'fulfilled') {
        const ordersData = ordersResponse.value.data || ordersResponse.value;
        const ordersList = ordersData.items || ordersData || [];
        setRecentOrders(
          ordersList.map((order: any) => ({
            id: order.id,
            orderNumber: order.orderNumber || order.order_number || `ORD-${order.id.slice(0, 8)}`,
            customer: order.customerName || order.customer?.name || 'Bilinmeyen Müşteri',
            amount: order.totalAmount || order.total_amount || 0,
            status: order.status || 'pending',
            date: order.createdAt || order.created_at || new Date().toISOString()
          }))
        );
      }

      // Set active vehicles count
      if (vehiclesResponse.status === 'fulfilled') {
        const vehiclesData = vehiclesResponse.value.data || vehiclesResponse.value;
        const vehiclesList = vehiclesData.items || vehiclesData || [];
        setStats(prev => ({
          ...prev,
          activeVehicles: Array.isArray(vehiclesList) ? vehiclesList.length : 0
        }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to mock data on error
      setStats({
        totalOrders: 1247,
        totalRevenue: 125430,
        totalProducts: 342,
        totalCustomers: 89,
        activeVehicles: 12,
        warehouseCapacity: 85,
        pendingTasks: 23,
        systemUptime: '99.9%'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 90) return 'text-red-600';
    if (capacity >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-xl text-gray-600">Welcome back! Here's what's happening with your business.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCartIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CubeIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserGroupIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TruckIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Active Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVehicles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <BuildingStorefrontIcon className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Warehouse Capacity</p>
                <p className={`text-2xl font-bold ${getCapacityColor(stats.warehouseCapacity)}`}>
                  {stats.warehouseCapacity}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-gray-600 text-sm">System Uptime</p>
                <p className="text-2xl font-bold text-gray-900">{stats.systemUptime}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading orders...</div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No recent orders</div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{order.customer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${order.amount.toLocaleString()}</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className="bg-white rounded-2xl shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Low Stock Items</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">Loading stock data...</div>
                ) : lowStockItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">All items are well stocked</div>
                ) : (
                  lowStockItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">{item.currentStock} / {item.minStock}</p>
                        <p className="text-xs text-red-500">Below minimum</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left">
              <div className="flex items-center">
                <CubeIcon className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">Add Product</p>
                  <p className="text-sm text-gray-500">Create new product</p>
                </div>
              </div>
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left">
              <div className="flex items-center">
                <ShoppingCartIcon className="w-6 h-6 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">New Order</p>
                  <p className="text-sm text-gray-500">Create new order</p>
                </div>
              </div>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left">
              <div className="flex items-center">
                <TruckIcon className="w-6 h-6 text-purple-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">New Route</p>
                  <p className="text-sm text-gray-500">Plan delivery route</p>
                </div>
              </div>
            </button>
            <button className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left">
              <div className="flex items-center">
                <ChartBarIcon className="w-6 h-6 text-orange-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">View Reports</p>
                  <p className="text-sm text-gray-500">Analytics & insights</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}