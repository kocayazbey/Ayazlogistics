'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Search, Filter, Plus, Edit, Eye, MapPin, Package, RefreshCw } from 'lucide-react';
import { wmsApi } from '../../../lib/api-comprehensive';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface ShelfItem {
  id: string;
  code: string;
  zone: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  capacity: number;
  currentLoad: number;
  locationType: 'pick' | 'bulk' | 'reserve';
  isOccupied: boolean;
  lastUpdated: string;
}

export default function ShelvesPage() {
  const [shelves, setShelves] = useState<ShelfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchShelves();
  }, [searchTerm, filterZone, filterType, filterStatus]);

  const fetchShelves = async () => {
    try {
      setLoading(true);
      const response = await wmsApi.getLocations({
        search: searchTerm || undefined,
        zone: filterZone !== 'all' ? filterZone : undefined,
        locationType: filterType !== 'all' ? filterType : undefined,
        isOccupied: filterStatus === 'occupied' ? true : filterStatus === 'available' ? false : undefined
      });
      const locationsData = response.data || response;
      
      const shelvesList: ShelfItem[] = Array.isArray(locationsData) 
        ? locationsData.map((loc: any) => ({
            id: loc.id,
            code: loc.code || `LOC-${loc.id}`,
            zone: loc.zone || '',
            aisle: loc.aisle || '',
            rack: loc.rack || '',
            shelf: loc.shelf || '',
            bin: loc.bin || '',
            capacity: loc.capacity || 0,
            currentLoad: loc.currentLoad || loc.occupiedSpace || 0,
            locationType: loc.locationType || 'bulk',
            isOccupied: loc.isOccupied || false,
            lastUpdated: loc.updatedAt || loc.lastUpdated || new Date().toISOString()
          }))
        : [];
      
      setShelves(shelvesList);
    } catch (error) {
      console.error('Error fetching shelves:', error);
      setShelves([]);
    } finally {
      setLoading(false);
    }
  };

  const getLocationTypeColor = (type: string) => {
    switch (type) {
      case 'pick': return 'bg-blue-100 text-blue-800';
      case 'bulk': return 'bg-green-100 text-green-800';
      case 'reserve': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLocationTypeText = (type: string) => {
    switch (type) {
      case 'pick': return 'Pick Location';
      case 'bulk': return 'Bulk Storage';
      case 'reserve': return 'Reserve';
      default: return 'Unknown';
    }
  };

  const getOccupancyColor = (currentLoad: number, capacity: number) => {
    const percentage = (currentLoad / capacity) * 100;
    if (percentage === 0) return 'bg-gray-500';
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredShelves = shelves.filter(shelf => {
    const matchesSearch = shelf.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shelf.zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = filterZone === 'all' || shelf.zone === filterZone;
    const matchesType = filterType === 'all' || shelf.locationType === filterType;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'occupied' && shelf.isOccupied) ||
                         (filterStatus === 'available' && !shelf.isOccupied);
    return matchesSearch && matchesZone && matchesType && matchesStatus;
  });

  const stats = [
    { label: 'Total Shelves', value: shelves.length.toString() },
    { label: 'Occupied', value: shelves.filter(s => s.isOccupied).length.toString() },
    { label: 'Available', value: shelves.filter(s => !s.isOccupied).length.toString() },
    { label: 'Avg Occupancy', value: `${Math.round(shelves.reduce((acc, s) => acc + (s.currentLoad / s.capacity) * 100, 0) / shelves.length || 0)}%` },
  ];

  const zones = [...new Set(shelves.map(shelf => shelf.zone))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Shelves Management</h1>
        <p className="text-gray-600">Manage warehouse shelf locations and capacity</p>
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
                placeholder="Search shelves..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Zones</option>
              {zones.map(zone => (
                <option key={zone} value={zone}>Zone {zone}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="pick">Pick Location</option>
              <option value="bulk">Bulk Storage</option>
              <option value="reserve">Reserve</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="occupied">Occupied</option>
              <option value="available">Available</option>
            </select>
            <button
              onClick={fetchShelves}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Shelves Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Shelf Locations</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Shelf
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading shelves...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Load</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShelves.map((shelf) => {
                  const occupancyPercentage = Math.round((shelf.currentLoad / shelf.capacity) * 100);
                  return (
                    <tr key={shelf.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{shelf.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Zone {shelf.zone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLocationTypeColor(shelf.locationType)}`}>
                          {getLocationTypeText(shelf.locationType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shelf.capacity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shelf.currentLoad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${getOccupancyColor(shelf.currentLoad, shelf.capacity)}`}
                              style={{ width: `${occupancyPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900">{occupancyPercentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          shelf.isOccupied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {shelf.isOccupied ? 'Occupied' : 'Available'}
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
