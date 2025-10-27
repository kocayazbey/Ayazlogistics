'use client';

import React, { useState } from 'react';
import { ClockIcon, UserIcon, DocumentTextIcon, FunnelIcon, TrashIcon, ArrowPathIcon, EyeIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  user: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  ipAddress: string;
  status: 'success' | 'failed';
}

interface SoftDeletedEntity {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  deletedAt: string;
  deletedBy: string;
  reason?: string;
  isRestored: boolean;
  retentionUntil: string;
}

export default function AuditLogs() {
  const [dateRange, setDateRange] = useState('today');
  const [actionFilter, setActionFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'logs' | 'soft-deletes'>('logs');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<SoftDeletedEntity | null>(null);

  const auditLogs: AuditLog[] = [
    { id: '1', user: 'John Doe', action: 'UPDATE', entity: 'customer', entityId: 'CUST-123', timestamp: '2025-10-24 14:30:00', ipAddress: '192.168.1.100', status: 'success' },
    { id: '2', user: 'Jane Smith', action: 'CREATE', entity: 'shipment', entityId: 'SHP-456', timestamp: '2025-10-24 14:25:00', ipAddress: '192.168.1.101', status: 'success' },
    { id: '3', user: 'Admin User', action: 'DELETE', entity: 'invoice', entityId: 'INV-789', timestamp: '2025-10-24 14:20:00', ipAddress: '192.168.1.1', status: 'success' },
    { id: '4', user: 'Bob Wilson', action: 'LOGIN', entity: 'auth', entityId: 'USER-321', timestamp: '2025-10-24 14:15:00', ipAddress: '192.168.1.102', status: 'failed' },
  ];

  const softDeletedEntities: SoftDeletedEntity[] = [
    { id: '1', entityType: 'users', entityId: 'user-123', entityName: 'John Doe', deletedAt: '2025-10-20 10:30:00', deletedBy: 'Admin User', reason: 'Policy violation', isRestored: false, retentionUntil: '2032-10-20' },
    { id: '2', entityType: 'products', entityId: 'prod-456', entityName: 'Sample Product', deletedAt: '2025-10-19 15:45:00', deletedBy: 'Manager', reason: 'Discontinued', isRestored: false, retentionUntil: '2032-10-19' },
    { id: '3', entityType: 'orders', entityId: 'ord-789', entityName: 'Order #789', deletedAt: '2025-10-18 09:15:00', deletedBy: 'System', reason: 'Automatic cleanup', isRestored: true, retentionUntil: '2032-10-18' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Denetim ve Kurtarma</h1>
            <p className="text-gray-600">Sistem aktivitelerini takip edin ve silinen verileri yönetin</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
              Rapor Dışa Aktar
            </button>
            <button className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700">
              Yedekleme Oluştur
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Denetim Günlükleri
              </button>
              <button
                onClick={() => setActiveTab('soft-deletes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'soft-deletes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Silinen Veriler ({softDeletedEntities.filter(e => !e.isRestored).length})
              </button>
            </nav>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: ClockIcon, label: 'Bugün Toplam İşlemler', value: '2,456', color: 'blue' },
            { icon: UserIcon, label: 'Aktif Kullanıcılar', value: '142', color: 'green' },
            { icon: DocumentTextIcon, label: 'Başarısız İşlemler', value: '8', color: 'red' },
            { icon: FunnelIcon, label: 'Uyumluluk Skoru', value: '99.7%', color: 'purple' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e: any) => setDateRange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e: any) => setActionFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login/Logout</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
              <input
                type="text"
                placeholder="Search user..."
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'logs' ? (
          /* Audit Logs Table */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.timestamp}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.user}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                          log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.entity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.entityId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.ipAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Soft Deletes Management */
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Silinen Veriler</h3>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                    Toplu Temizle
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    Toplu Geri Yükle
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deleted At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deleted By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retention Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {softDeletedEntities.map((entity) => (
                    <tr key={entity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {entity.entityType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entity.entityName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entity.deletedAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entity.deletedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entity.reason || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {entity.retentionUntil}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          entity.isRestored
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {entity.isRestored ? 'Restored' : 'Deleted'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedEntity(entity);
                              setShowDeleteModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {!entity.isRestored && (
                            <button
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Restore"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Permanently Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

