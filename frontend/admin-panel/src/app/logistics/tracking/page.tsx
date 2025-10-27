'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Search, Filter, MapPin, Package, Truck, Eye, Navigation, AlertCircle, RefreshCw } from 'lucide-react';
import { tmsApi } from '../../../lib/api-comprehensive';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { useWebSocket } from '../../../lib/websocket/useWebSocket';

interface TrackingItem {
  id: string;
  trackingNumber: string;
  shipmentId: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';
  currentLocation: string;
  destination: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  assignedVehicle: string;
  assignedDriver: string;
  packages: number;
  weight: number;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  lastUpdate: string;
  notes?: string;
}

export default function TrackingPage() {
  const [trackings, setTrackings] = useState<TrackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  // WebSocket connection for real-time updates
  const { socket, isConnected, lastUpdate } = useWebSocket({
    namespace: '/tracking',
    autoConnect: true,
  });

  useEffect(() => {
    // Initial data load
    fetchTrackings();

    // Subscribe to real-time updates if WebSocket is connected
    if (socket && isConnected) {
      socket.on('shipment-update', (data: any) => {
        setTrackings(prev => {
          const existingIndex = prev.findIndex(t => t.id === data.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...data,
              lastUpdate: new Date().toISOString()
            };
            return updated;
          }
          return prev;
        });
      });

      socket.on('location-update', (data: any) => {
        setTrackings(prev => {
          const existingIndex = prev.findIndex(t => t.id === data.shipmentId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              currentLocation: data.location,
              lastUpdate: new Date().toISOString()
            };
            return updated;
          }
          return prev;
        });
      });

      socket.on('tracking-status-change', (data: any) => {
        setTrackings(prev => {
          const existingIndex = prev.findIndex(t => t.id === data.shipmentId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              status: data.status,
              lastUpdate: new Date().toISOString()
            };
            return updated;
          }
          return prev;
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('shipment-update');
        socket.off('location-update');
        socket.off('tracking-status-change');
      }
    };
  }, [socket, isConnected]);

  // Handle search and filter changes with debouncing
  useEffect(() => {
    if (isConnected) {
      // If WebSocket is connected, only update filters, don't refetch
      return;
    }
    // Fallback to polling if WebSocket is not connected
    fetchTrackings();
  }, [debouncedSearch, filterStatus, filterPriority, isConnected]);

  const fetchTrackings = async () => {
    try {
      setLoading(true);
      const response = await tmsApi.getShipments({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        priority: filterPriority !== 'all' ? filterPriority : undefined,
        search: debouncedSearch || undefined
      });
      const shipmentsData = response.data || response;
      
      const trackingsList: TrackingItem[] = Array.isArray(shipmentsData) 
        ? shipmentsData.map((ship: any) => ({
            id: ship.id,
            trackingNumber: ship.trackingNumber || ship.trackingCode || `TRK-${ship.id}`,
            shipmentId: ship.id,
            status: ship.status || 'pending',
            currentLocation: ship.currentLocation || ship.location || 'Unknown',
            destination: ship.destination || ship.deliveryAddress || 'Unknown',
            estimatedDelivery: ship.estimatedDelivery || ship.eta || '',
            actualDelivery: ship.actualDelivery || ship.deliveredAt,
            assignedVehicle: ship.vehicle?.name || ship.vehicleId || 'Unassigned',
            assignedDriver: ship.driver?.name || ship.driverId || 'Unassigned',
            packages: ship.packages || ship.packageCount || 0,
            weight: ship.weight || ship.totalWeight || 0,
            priority: ship.priority || 'medium',
            createdAt: ship.createdAt || new Date().toISOString(),
            lastUpdate: ship.updatedAt || ship.lastUpdate || new Date().toISOString(),
            notes: ship.notes || ship.description
          }))
        : [];
      
      setTrackings(trackingsList);
    } catch (error: any) {
      console.error('Error fetching trackings:', error);
      toast.error(error?.response?.data?.message || 'Takip bilgileri yüklenirken bir hata oluştu');
      setTrackings([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'picked_up': return 'bg-blue-100 text-blue-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'exception': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'exception': return 'Exception';
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

  const isOverdue = (estimatedDelivery: string, status: string) => {
    if (status === 'delivered') return false;
    const estimated = new Date(estimatedDelivery);
    const now = new Date();
    return now > estimated;
  };

  const filteredTrackings = trackings.filter(tracking => {
    const matchesSearch = tracking.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tracking.shipmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tracking.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tracking.assignedDriver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || tracking.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || tracking.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = [
    { label: 'Total Shipments', value: trackings.length.toString() },
    { label: 'In Transit', value: trackings.filter(t => t.status === 'in_transit').length.toString() },
    { label: 'Delivered Today', value: trackings.filter(t => t.status === 'delivered' && new Date(t.actualDelivery || '').toDateString() === new Date().toDateString()).length.toString() },
    { label: 'Exceptions', value: trackings.filter(t => t.status === 'exception').length.toString() },
  ];

  const priorities = [...new Set(trackings.map(tracking => tracking.priority))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shipment Tracking</h1>
            <p className="text-gray-600">Real-time tracking and monitoring of all shipments</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              {isConnected ? 'Live Updates' : 'Offline Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-yellow-500 to-orange-500',
            'from-green-500 to-emerald-500',
            'from-red-500 to-pink-500'
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
                placeholder="Search shipments..."
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
              <option value="pending">Pending</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_transit">In Transit</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="exception">Exception</option>
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
              onClick={fetchTrackings}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Tracking Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Active Shipments</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              Live Map
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading shipments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTrackings.map((tracking) => (
                  <tr key={tracking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tracking.trackingNumber}</div>
                        <div className="text-sm text-gray-500">{tracking.shipmentId}</div>
                        <div className="text-xs text-gray-400">{tracking.packages} packages • {tracking.weight}kg</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tracking.status)}`}>
                          {getStatusText(tracking.status)}
                        </span>
                        {isOverdue(tracking.estimatedDelivery, tracking.status) && (
                          <AlertCircle className="w-4 h-4 text-red-500 ml-2" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{tracking.currentLocation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tracking.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {tracking.actualDelivery ? 
                          `Delivered: ${new Date(tracking.actualDelivery).toLocaleString()}` :
                          `Est: ${new Date(tracking.estimatedDelivery).toLocaleString()}`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">{tracking.assignedDriver}</div>
                          <div className="text-xs text-gray-500">{tracking.assignedVehicle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(tracking.priority)}`}>
                        {getPriorityText(tracking.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900" title="Track on Map">
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
