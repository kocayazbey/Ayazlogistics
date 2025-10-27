'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, Search, Filter, Plus, Edit, Eye, Trash2, CheckCircle, XCircle, Clock, Settings, RefreshCw } from 'lucide-react';
import { integrationsApi } from '../../../lib/api/integrations.api';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface IntegrationItem {
  id: string;
  name: string;
  type: 'erp' | 'crm' | 'api' | 'webhook' | 'database';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  description: string;
  lastSync: string;
  nextSync?: string;
  syncFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
  apiVersion: string;
  endpoint: string;
  errorMessage?: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchIntegrations();
  }, [searchTerm, filterType, filterStatus]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await integrationsApi.getIntegrations({
        search: searchTerm || undefined,
        type: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });
      const integrationsData = response.data?.items || response.data || response;
      
      const integrationsList: IntegrationItem[] = Array.isArray(integrationsData) 
        ? integrationsData.map((int: any) => ({
            id: int.id,
            name: int.name || 'Unknown Integration',
            type: int.type || 'api',
            status: int.status || 'pending',
            description: int.description || '',
            lastSync: int.lastSync || int.lastSyncedAt || '',
            nextSync: int.nextSync || int.nextSyncAt,
            syncFrequency: int.syncFrequency || int.frequency || 'manual',
            apiVersion: int.apiVersion || int.version || '1.0.0',
            endpoint: int.endpoint || int.url || '',
            errorMessage: int.errorMessage || int.error
          }))
        : [];
      
      setIntegrations(integrationsList);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'erp': return 'bg-blue-100 text-blue-800';
      case 'crm': return 'bg-green-100 text-green-800';
      case 'api': return 'bg-purple-100 text-purple-800';
      case 'webhook': return 'bg-orange-100 text-orange-800';
      case 'database': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'erp': return 'ERP';
      case 'crm': return 'CRM';
      case 'api': return 'API';
      case 'webhook': return 'Webhook';
      case 'database': return 'Database';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return CheckCircle;
      case 'disconnected': return XCircle;
      case 'error': return XCircle;
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
      case 'manual': return 'Manual';
      default: return 'Unknown';
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || integration.type === filterType;
    const matchesStatus = filterStatus === 'all' || integration.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = [
    { label: 'Total Integrations', value: integrations.length.toString() },
    { label: 'Connected', value: integrations.filter(i => i.status === 'connected').length.toString() },
    { label: 'Errors', value: integrations.filter(i => i.status === 'error').length.toString() },
    { label: 'Pending', value: integrations.filter(i => i.status === 'pending').length.toString() },
  ];

  const types = [...new Set(integrations.map(integration => integration.type))];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations Management</h1>
        <p className="text-gray-600">Manage external system integrations and APIs</p>
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
                placeholder="Search integrations..."
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
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="error">Error</option>
              <option value="pending">Pending</option>
            </select>
            <button
              onClick={fetchIntegrations}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Integrations Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">System Integrations</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading integrations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Integration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sync Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIntegrations.map((integration) => {
                  const StatusIcon = getStatusIcon(integration.status);
                  
                  return (
                    <tr key={integration.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Wrench className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                            <div className="text-sm text-gray-500">{integration.description}</div>
                            {integration.errorMessage && (
                              <div className="text-xs text-red-600 mt-1">{integration.errorMessage}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(integration.type)}`}>
                          {getTypeText(integration.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <StatusIcon className={`w-4 h-4 mr-2 ${
                            integration.status === 'connected' ? 'text-green-500' :
                            integration.status === 'error' ? 'text-red-500' :
                            integration.status === 'pending' ? 'text-yellow-500' :
                            'text-gray-500'
                          }`} />
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                            {getStatusText(integration.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getFrequencyText(integration.syncFrequency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {integration.lastSync}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {integration.endpoint}
                        </div>
                        <div className="text-xs text-gray-500">
                          v{integration.apiVersion}
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
                          <button className="text-green-600 hover:text-green-900">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            <Trash2 className="w-4 h-4" />
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
