'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Search, Filter, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { suppliersApi } from '../../../lib/api/suppliers.api';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface SyncItem {
  id: string;
  supplier: string;
  status: 'synced' | 'syncing' | 'failed' | 'pending';
  lastSync: string;
  nextSync: string;
  itemsSynced: number;
  totalItems: number;
  syncDuration: number;
  errorMessage?: string;
  autoSync: boolean;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

export default function StockSyncPage() {
  const [syncs, setSyncs] = useState<SyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchSyncs();
  }, [searchTerm, filterStatus]);

  const fetchSyncs = async () => {
    try {
      setLoading(true);
      const response = await suppliersApi.getSyncHistory({
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: searchTerm || undefined
      });
      const syncData = response.data?.items || response.data || response;
      
      const syncsList: SyncItem[] = Array.isArray(syncData) 
        ? syncData.map((sync: any) => ({
            id: sync.id,
            supplier: sync.supplier?.name || sync.supplierName || 'Unknown',
            status: sync.status || 'pending',
            lastSync: sync.lastSync || sync.lastSyncedAt || '',
            nextSync: sync.nextSync || sync.nextSyncAt || '',
            itemsSynced: sync.itemsSynced || sync.syncedCount || 0,
            totalItems: sync.totalItems || sync.totalCount || 0,
            syncDuration: sync.syncDuration || sync.duration || 0,
            errorMessage: sync.errorMessage || sync.error,
            autoSync: sync.autoSync || false,
            syncFrequency: sync.syncFrequency || sync.frequency || 'manual'
          }))
        : [];
      
      setSyncs(syncsList);
    } catch (error) {
      console.error('Error fetching syncs:', error);
      setSyncs([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'syncing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'synced': return 'Synced';
      case 'syncing': return 'Syncing';
      case 'failed': return 'Failed';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced': return CheckCircle;
      case 'syncing': return RefreshCw;
      case 'failed': return XCircle;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'realtime': return 'Real-time';
      case 'hourly': return 'Hourly';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      default: return 'Unknown';
    }
  };

  const getSyncProgress = (synced: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((synced / total) * 100);
  };

  const filteredSyncs = syncs.filter(sync => {
    const matchesSearch = sync.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sync.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Suppliers', value: syncs.length.toString() },
    { label: 'Synced', value: syncs.filter(s => s.status === 'synced').length.toString() },
    { label: 'Failed', value: syncs.filter(s => s.status === 'failed').length.toString() },
    { label: 'Auto Sync', value: syncs.filter(s => s.autoSync).length.toString() },
  ];

  const handleSyncNow = async (supplierId: string) => {
    try {
      // Update status to syncing
      setSyncs(prev => prev.map(sync => 
        sync.id === supplierId 
          ? { ...sync, status: 'syncing' as const }
          : sync
      ));

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status to synced
      setSyncs(prev => prev.map(sync => 
        sync.id === supplierId 
          ? { 
              ...sync, 
              status: 'synced' as const,
              lastSync: new Date().toISOString(),
              itemsSynced: sync.totalItems
            }
          : sync
      ));
    } catch (error) {
      // Update status to failed
      setSyncs(prev => prev.map(sync => 
        sync.id === supplierId 
          ? { 
              ...sync, 
              status: 'failed' as const,
              errorMessage: 'Sync failed'
            }
          : sync
      ));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Sync</h1>
        <p className="text-gray-600">Synchronize inventory data with suppliers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-red-500 to-pink-500',
            'from-purple-500 to-indigo-500'
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
                placeholder="Search suppliers..."
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
              <option value="synced">Synced</option>
              <option value="syncing">Syncing</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={fetchSyncs}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Sync Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Sync Status</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Sync All
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading sync status...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Sync</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSyncs.map((sync) => {
                  const StatusIcon = getStatusIcon(sync.status);
                  const progress = getSyncProgress(sync.itemsSynced, sync.totalItems);
                  
                  return (
                    <tr key={sync.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Wrench className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sync.supplier}</div>
                            <div className="text-sm text-gray-500">
                              {sync.autoSync ? 'Auto Sync' : 'Manual Sync'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StatusIcon className={`w-4 h-4 mr-2 ${
                            sync.status === 'synced' ? 'text-green-500' :
                            sync.status === 'syncing' ? 'text-blue-500 animate-spin' :
                            sync.status === 'failed' ? 'text-red-500' :
                            'text-yellow-500'
                          }`} />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sync.status)}`}>
                            {getStatusText(sync.status)}
                          </span>
                        </div>
                        {sync.errorMessage && (
                          <div className="text-xs text-red-600 mt-1">{sync.errorMessage}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                progress === 100 ? 'bg-green-500' :
                                progress > 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-900">{progress}%</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {sync.itemsSynced} / {sync.totalItems} items
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sync.lastSync).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(sync.nextSync).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getFrequencyText(sync.syncFrequency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleSyncNow(sync.id)}
                            disabled={sync.status === 'syncing'}
                            className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            <RefreshCw className={`w-4 h-4 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
                          </button>
                          {sync.status === 'failed' && (
                            <button className="text-red-600 hover:text-red-900" title="View Error">
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
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
