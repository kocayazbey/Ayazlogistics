'use client';

import React, { useState, useEffect } from 'react';
import { Truck, Search, Filter, Plus, Edit, Eye, Fuel, Gauge, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import { tmsApi } from '../../../lib/api-comprehensive';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface VehicleItem {
  id: string;
  vehicleNumber: string;
  make: string;
  model: string;
  year: number;
  type: 'truck' | 'van' | 'trailer' | 'forklift';
  status: 'active' | 'maintenance' | 'inactive' | 'in_use';
  capacity: number;
  fuelLevel: number;
  mileage: number;
  lastService: string;
  nextService: string;
  currentLocation: string;
  assignedDriver: string;
  licensePlate: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchVehicles();
  }, [debouncedSearch, filterType, filterStatus]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await tmsApi.getVehicles({
        search: debouncedSearch,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });
      const vehiclesData = response.data || response;
      
      // Transform API response to match our interface
      const vehicles: VehicleItem[] = Array.isArray(vehiclesData) 
        ? vehiclesData.map((v: any) => ({
            id: v.id,
            vehicleNumber: v.vehicleNumber || v.licensePlate || `TR-${v.id}`,
            make: v.make || 'Unknown',
            model: v.model || 'Unknown',
            year: v.year || new Date().getFullYear(),
            type: v.type || 'truck',
            status: v.status || 'inactive',
            capacity: v.capacity || 0,
            fuelLevel: v.fuelLevel || 0,
            mileage: v.mileage || v.totalMileage || 0,
            lastService: v.lastServiceDate || new Date().toISOString().split('T')[0],
            nextService: v.nextServiceDate || new Date().toISOString().split('T')[0],
            currentLocation: v.currentLocation || 'Unknown',
            assignedDriver: v.driver?.name || 'Unassigned',
            licensePlate: v.licensePlate || 'N/A'
          }))
        : [];
      
      setVehicles(vehicles);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      toast.error(error?.response?.data?.message || 'Araçlar yüklenirken bir hata oluştu');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'in_use': return 'In Use';
      case 'maintenance': return 'Maintenance';
      case 'inactive': return 'Inactive';
      default: return 'Unknown';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'truck': return 'bg-blue-100 text-blue-800';
      case 'van': return 'bg-green-100 text-green-800';
      case 'trailer': return 'bg-purple-100 text-purple-800';
      case 'forklift': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'truck': return 'Truck';
      case 'van': return 'Van';
      case 'trailer': return 'Trailer';
      case 'forklift': return 'Forklift';
      default: return 'Unknown';
    }
  };

  const getFuelColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const needsService = (nextService: string) => {
    const nextServiceDate = new Date(nextService);
    const now = new Date();
    const daysUntilService = Math.ceil((nextServiceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilService <= 30;
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || vehicle.type === filterType;
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = [
    { label: 'Total Vehicles', value: vehicles.length.toString() },
    { label: 'Active', value: vehicles.filter(v => v.status === 'active').length.toString() },
    { label: 'In Use', value: vehicles.filter(v => v.status === 'in_use').length.toString() },
    { label: 'Maintenance', value: vehicles.filter(v => v.status === 'maintenance').length.toString() },
  ];

  const types = [...new Set(vehicles.map(vehicle => vehicle.type))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
        <p className="text-gray-600">Monitor and manage your fleet of vehicles</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-purple-500 to-pink-500',
            'from-yellow-500 to-orange-500'
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
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{getTypeText(type)}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="in_use">In Use</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              onClick={fetchVehicles}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Vehicle Fleet</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchVehicles}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first vehicle'}
            </p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mileage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Truck className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{vehicle.vehicleNumber}</div>
                          <div className="text-sm text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</div>
                          <div className="text-xs text-gray-400">{vehicle.licensePlate}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(vehicle.type)}`}>
                        {getTypeText(vehicle.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vehicle.status)}`}>
                        {getStatusText(vehicle.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Fuel className={`w-4 h-4 mr-2 ${getFuelColor(vehicle.fuelLevel)}`} />
                        <span className={`text-sm font-medium ${getFuelColor(vehicle.fuelLevel)}`}>
                          {vehicle.fuelLevel}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.mileage.toLocaleString()} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {vehicle.assignedDriver}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{vehicle.currentLocation}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Edit className="w-4 h-4" />
                        </button>
                        {needsService(vehicle.nextService) && (
                          <button className="text-yellow-600 hover:text-yellow-900" title="Service Due Soon">
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        )}
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
