'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Search, Filter, Plus, Edit, Eye, Wifi, Battery, RefreshCw } from 'lucide-react';
import { wmsApi } from '../../../lib/api-comprehensive';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface TerminalItem {
  id: string;
  deviceId: string;
  name: string;
  type: 'handheld' | 'scanner' | 'printer' | 'tablet';
  status: 'online' | 'offline' | 'maintenance' | 'error';
  batteryLevel: number;
  signalStrength: number;
  lastSync: string;
  location: string;
  assignedUser: string;
  firmwareVersion: string;
}

export default function TerminalsPage() {
  const [terminals, setTerminals] = useState<TerminalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchTerminals();
  }, [debouncedSearch, filterType, filterStatus]);

  const fetchTerminals = async () => {
    try {
      setLoading(true);
      const response = await wmsApi.getTerminals({
        search: debouncedSearch || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });
      const terminalsData = response.data || response;
      
      const terminalsList: TerminalItem[] = Array.isArray(terminalsData) 
        ? terminalsData.map((term: any) => ({
            id: term.id,
            deviceId: term.deviceId || term.serialNumber || `DEV-${term.id}`,
            name: term.name || term.deviceName || 'Unknown Device',
            type: term.type || 'handheld',
            status: term.status || 'offline',
            batteryLevel: term.batteryLevel || 0,
            signalStrength: term.signalStrength || 0,
            lastSync: term.lastSync || term.lastSyncedAt || '',
            location: term.location || term.currentLocation || 'Unknown',
            assignedUser: term.assignedUser || term.user?.name || 'Unassigned',
            firmwareVersion: term.firmwareVersion || term.version || '1.0.0'
          }))
        : [];
      
      setTerminals(terminalsList);
    } catch (error) {
      console.error('Error fetching terminals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'offline': return 'Offline';
      case 'maintenance': return 'Maintenance';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'handheld': return 'bg-blue-100 text-blue-800';
      case 'scanner': return 'bg-green-100 text-green-800';
      case 'printer': return 'bg-purple-100 text-purple-800';
      case 'tablet': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'handheld': return 'Handheld';
      case 'scanner': return 'Scanner';
      case 'printer': return 'Printer';
      case 'tablet': return 'Tablet';
      default: return 'Unknown';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-600';
    if (level > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalColor = (strength: number) => {
    if (strength > 75) return 'text-green-600';
    if (strength > 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredTerminals = terminals.filter(terminal => {
    const matchesSearch = terminal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         terminal.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         terminal.assignedUser.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || terminal.type === filterType;
    const matchesStatus = filterStatus === 'all' || terminal.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = [
    { label: 'Total Devices', value: terminals.length.toString() },
    { label: 'Online', value: terminals.filter(t => t.status === 'online').length.toString() },
    { label: 'Offline', value: terminals.filter(t => t.status === 'offline').length.toString() },
    { label: 'Maintenance', value: terminals.filter(t => t.status === 'maintenance').length.toString() },
  ];

  const types = [...new Set(terminals.map(terminal => terminal.type))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Handheld Devices Management</h1>
        <p className="text-gray-600">Monitor and manage warehouse handheld devices and terminals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-red-500 to-pink-500',
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
                placeholder="Search devices..."
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
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
              <option value="error">Error</option>
            </select>
            <button
              onClick={fetchTerminals}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Terminals Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Device List</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Device
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading devices...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Battery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTerminals.map((terminal) => (
                  <tr key={terminal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{terminal.name}</div>
                        <div className="text-sm text-gray-500">{terminal.deviceId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(terminal.type)}`}>
                        {getTypeText(terminal.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(terminal.status)}`}>
                        {getStatusText(terminal.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Battery className={`w-4 h-4 mr-2 ${getBatteryColor(terminal.batteryLevel)}`} />
                        <span className={`text-sm font-medium ${getBatteryColor(terminal.batteryLevel)}`}>
                          {terminal.batteryLevel}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Wifi className={`w-4 h-4 mr-2 ${getSignalColor(terminal.signalStrength)}`} />
                        <span className={`text-sm font-medium ${getSignalColor(terminal.signalStrength)}`}>
                          {terminal.signalStrength}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {terminal.assignedUser}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(terminal.lastSync).toLocaleString()}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
