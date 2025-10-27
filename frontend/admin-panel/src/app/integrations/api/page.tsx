'use client';

import React, { useState } from 'react';
import { 
  Link, 
  Key, 
  Settings,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Eye,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Database,
  Cloud
} from 'lucide-react';

export default function IntegrationsAPIPage() {
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [activeTab, setActiveTab] = useState('apis');

  const apiIntegrations = [
    {
      id: 'API001',
      name: 'SAP ERP Entegrasyonu',
      description: 'SAP sistemleri ile veri senkronizasyonu',
      status: 'active',
      endpoint: 'https://api.ayazlogistics.com/sap',
      method: 'REST',
      lastSync: '2024-01-27 14:30:25',
      requests: 1250,
      errors: 3,
      uptime: 99.8,
      icon: Database,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'API002',
      name: 'TMS Rota Optimizasyonu',
      description: 'Harici rota optimizasyon servisi',
      status: 'active',
      endpoint: 'https://api.ayazlogistics.com/tms/optimize',
      method: 'GraphQL',
      lastSync: '2024-01-27 14:25:10',
      requests: 890,
      errors: 1,
      uptime: 99.9,
      icon: Globe,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'API003',
      name: 'Müşteri CRM Sistemi',
      description: 'Müşteri verileri senkronizasyonu',
      status: 'inactive',
      endpoint: 'https://api.ayazlogistics.com/crm',
      method: 'REST',
      lastSync: '2024-01-26 18:45:30',
      requests: 0,
      errors: 0,
      uptime: 0,
      icon: Cloud,
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  const webhookIntegrations = [
    {
      id: 'WH001',
      name: 'Sipariş Bildirimleri',
      description: 'Yeni siparişler için webhook',
      url: 'https://webhook.site/abc123',
      events: ['order.created', 'order.updated'],
      status: 'active',
      lastTrigger: '2024-01-27 14:30:25',
      totalTriggers: 45,
      icon: Link,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'WH002',
      name: 'Stok Güncellemeleri',
      description: 'Stok değişiklikleri için bildirim',
      url: 'https://webhook.site/def456',
      events: ['inventory.updated'],
      status: 'active',
      lastTrigger: '2024-01-27 13:15:40',
      totalTriggers: 23,
      icon: Link,
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  const apiKeys = [
    {
      id: 'KEY001',
      name: 'Production API Key',
      key: 'ak_live_1234567890abcdef',
      permissions: ['read', 'write'],
      createdAt: '2024-01-15',
      lastUsed: '2024-01-27 14:30:25',
      status: 'active',
      usage: 1250
    },
    {
      id: 'KEY002',
      name: 'Development API Key',
      key: 'ak_test_abcdef1234567890',
      permissions: ['read'],
      createdAt: '2024-01-20',
      lastUsed: '2024-01-26 16:45:10',
      status: 'active',
      usage: 89
    },
    {
      id: 'KEY003',
      name: 'Legacy API Key',
      key: 'ak_legacy_9876543210fedcba',
      permissions: ['read'],
      createdAt: '2023-12-01',
      lastUsed: '2024-01-20 10:30:15',
      status: 'inactive',
      usage: 0
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'inactive':
        return 'Pasif';
      case 'error':
        return 'Hata';
      default:
        return 'Bilinmiyor';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'REST':
        return 'bg-blue-100 text-blue-800';
      case 'GraphQL':
        return 'bg-purple-100 text-purple-800';
      case 'SOAP':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">API Entegrasyonları</h1>
          <p className="text-gray-600">Dış sistemlerle entegrasyonları yönetin</p>
        </div>

        {/* Integration Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Link className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm text-green-600 font-medium">2/3</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Aktif Entegrasyon</div>
            <div className="text-sm text-gray-600">Toplam 3 entegrasyondan</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm text-green-600 font-medium">99.9%</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Uptime</div>
            <div className="text-sm text-gray-600">Ortalama sistem çalışma süresi</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Key className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-sm text-blue-600 font-medium">3</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">API Anahtarları</div>
            <div className="text-sm text-gray-600">Aktif API anahtarları</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-sm text-orange-600 font-medium">4</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Hata Sayısı</div>
            <div className="text-sm text-gray-600">Son 24 saatte</div>
          </div>
        </div>

        {/* Integration Management Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-8">
              {[
                { id: 'apis', name: 'API Entegrasyonları', icon: Link },
                { id: 'webhooks', name: 'Webhook\'lar', icon: Globe },
                { id: 'keys', name: 'API Anahtarları', icon: Key },
                { id: 'logs', name: 'Loglar', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* API Integrations */}
            {activeTab === 'apis' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">API Entegrasyonları</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Entegrasyon
                  </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {apiIntegrations.map((integration) => (
                    <div key={integration.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${integration.color}`}>
                            <integration.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{integration.name}</h4>
                            <p className="text-sm text-gray-600">{integration.description}</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(integration.status)}`}>
                          {getStatusText(integration.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Endpoint:</span>
                          <span className="font-mono text-gray-900">{integration.endpoint}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Method:</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getMethodColor(integration.method)}`}>
                            {integration.method}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Son Senkronizasyon:</span>
                          <span className="text-gray-900">{integration.lastSync}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">İstek Sayısı:</span>
                          <span className="text-gray-900">{integration.requests.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Hata Sayısı:</span>
                          <span className="text-gray-900">{integration.errors}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Uptime:</span>
                          <span className="text-gray-900">%{integration.uptime}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Ayarlar
                        </button>
                        <button className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                          <Play className="w-4 h-4 mr-1" />
                          Test
                        </button>
                        <button className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Loglar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Webhook Integrations */}
            {activeTab === 'webhooks' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Webhook Entegrasyonları</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Webhook
                  </button>
                </div>
                
                <div className="space-y-4">
                  {webhookIntegrations.map((webhook) => (
                    <div key={webhook.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${webhook.color}`}>
                            <webhook.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{webhook.name}</h4>
                            <p className="text-sm text-gray-600">{webhook.description}</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(webhook.status)}`}>
                          {getStatusText(webhook.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">URL:</div>
                          <div className="font-mono text-sm text-gray-900">{webhook.url}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Olaylar:</div>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {event}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Son Tetikleme:</div>
                          <div className="text-sm text-gray-900">{webhook.lastTrigger}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Toplam Tetikleme:</div>
                          <div className="text-sm text-gray-900">{webhook.totalTriggers}</div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Düzenle
                        </button>
                        <button className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                          <Play className="w-4 h-4 mr-1" />
                          Test
                        </button>
                        <button className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Keys */}
            {activeTab === 'keys' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">API Anahtarları</h3>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Anahtar
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Anahtar Adı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          API Anahtarı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İzinler
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Son Kullanım
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{key.name}</div>
                            <div className="text-sm text-gray-500">#{key.id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="font-mono text-sm text-gray-900">{key.key}</span>
                              <button className="ml-2 p-1 text-gray-400 hover:text-gray-600">
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1">
                              {key.permissions.map((permission, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {permission}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {key.lastUsed}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(key.status)}`}>
                              {getStatusText(key.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
}
