'use client';

import React, { useState, useEffect } from 'react';
import { Map, Search, Filter, Plus, Edit, Eye, Navigation, Clock, Package, Truck, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { tmsApi } from '../../../lib/api-comprehensive';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface RouteItem {
  id: string;
  routeCode: string;
  name: string;
  startLocation: string;
  endLocation: string;
  distance: number;
  estimatedTime: number;
  status: 'active' | 'inactive' | 'maintenance' | 'optimizing';
  priority: 'high' | 'medium' | 'low';
  assignedVehicle: string;
  assignedDriver: string;
  stops: number;
  totalPackages: number;
  createdAt: string;
  lastOptimized: string;
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchRoutes();
  }, [debouncedSearch, filterStatus, filterPriority]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await tmsApi.getRoutes({
        search: debouncedSearch,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        priority: filterPriority !== 'all' ? filterPriority : undefined
      });
      const routesData = response.data || response;
      
      // Transform API response to match our interface
      const routesList: RouteItem[] = Array.isArray(routesData) 
        ? routesData.map((r: any) => ({
            id: r.id,
            routeCode: r.code || r.routeCode || `RT-${r.id}`,
            name: r.name || r.description || 'Unnamed Route',
            startLocation: r.startLocation || r.origin || 'Unknown',
            endLocation: r.endLocation || r.destination || 'Unknown',
            distance: r.distance || r.totalDistance || 0,
            estimatedTime: r.estimatedTime || r.duration || 0,
            status: r.status || 'inactive',
            priority: r.priority || 'medium',
            assignedVehicle: r.vehicle?.name || r.vehicleId || 'Unassigned',
            assignedDriver: r.driver?.name || r.driverId || 'Unassigned',
            stops: r.stops?.length || r.stopCount || 0,
            totalPackages: r.totalPackages || r.packageCount || 0,
            createdAt: r.createdAt || new Date().toISOString(),
            lastOptimized: r.lastOptimized || r.updatedAt || new Date().toISOString()
          }))
        : [];
      
      setRoutes(routesList);
    } catch (error: any) {
      console.error('Error fetching routes:', error);
      toast.error(error?.response?.data?.message || 'Rotalar yüklenirken bir hata oluştu');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'optimizing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'maintenance': return 'Maintenance';
      case 'optimizing': return 'Optimizing';
      default: return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const filteredRoutes = routes;

  const stats = [
    { label: 'Total Routes', value: routes.length.toString() },
    { label: 'Active Routes', value: routes.filter(r => r.status === 'active').length.toString() },
    { label: 'Total Distance', value: `${routes.reduce((acc, r) => acc + r.distance, 0).toFixed(1)} km` },
    { label: 'Avg Stops', value: Math.round(routes.reduce((acc, r) => acc + r.stops, 0) / routes.length || 0).toString() },
  ];

  const priorities = [...new Set(routes.map(route => route.priority))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Route Management</h1>
        <p className="text-gray-600">Plan, optimize and manage delivery routes</p>
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
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search routes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
              <option value="optimizing">Optimizing</option>
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority} value={priority}>{getPriorityText(priority)}</option>
              ))}
            </select>
            <button
              onClick={fetchRoutes}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Route List</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchRoutes}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Optimize All
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Route
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading routes...</p>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="p-12 text-center">
            <RouteIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No routes found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first route'}
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Add Route
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Path</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stops</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Map className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{route.name}</div>
                          <div className="text-sm text-gray-500">{route.routeCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          {route.startLocation}
                        </div>
                        <div className="flex items-center mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          {route.endLocation}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {route.distance} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{formatTime(route.estimatedTime)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{route.stops}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(route.status)}`}>
                        {getStatusText(route.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(route.priority)}`}>
                        {getPriorityText(route.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900" title="Optimize Route">
                          <Navigation className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
