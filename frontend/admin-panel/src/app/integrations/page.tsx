'use client';

import React, { useState, useEffect } from 'react';
import { 
  LinkIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  category: string;
  lastSync: string;
  usage: string;
  cost: string;
  config?: any;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('connected');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations');
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
      // Fallback to mock data
      setIntegrations([
    {
      id: '1',
      name: 'Google Maps API',
      description: 'Harita ve konum servisleri',
      status: 'connected',
      icon: '🗺️',
      category: 'Maps',
      lastSync: '2024-10-24 14:30',
      usage: '85%',
      cost: '$45/month'
    },
    {
      id: '2',
      name: 'E-Fatura (GİB)',
      description: 'Elektronik fatura entegrasyonu',
      status: 'connected',
      icon: '📄',
      category: 'Billing',
      lastSync: '2024-10-24 13:45',
      usage: '92%',
      cost: '$120/month'
    },
    {
      id: '3',
      name: 'İyzico Payment',
      description: 'Ödeme işlemleri',
      status: 'connected',
      icon: '💳',
      category: 'Payment',
      lastSync: '2024-10-24 12:15',
      usage: '78%',
      cost: '$89/month'
    },
    {
      id: '4',
      name: 'SendGrid Email',
      description: 'E-posta gönderimi',
      status: 'connected',
      icon: '📧',
      category: 'Communication',
      lastSync: '2024-10-24 11:30',
      usage: '65%',
      cost: '$35/month'
    },
    {
      id: '5',
      name: 'Netgsm SMS',
      description: 'SMS gönderimi',
      status: 'disconnected',
      icon: '📱',
      category: 'Communication',
      lastSync: 'Never',
      usage: '0%',
      cost: '$0/month'
    },
    {
      id: '6',
      name: 'WhatsApp Business',
      description: 'WhatsApp mesajlaşma',
      status: 'error',
      icon: '💬',
      category: 'Communication',
      lastSync: '2024-10-23 16:20',
      usage: '0%',
      cost: '$0/month'
    }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/connect`, {
        method: 'POST',
      });
      if (response.ok) {
        loadIntegrations();
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/disconnect`, {
        method: 'POST',
      });
      if (response.ok) {
        loadIntegrations();
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
      });
      if (response.ok) {
        loadIntegrations();
      }
    } catch (error) {
      console.error('Error syncing integration:', error);
    }
  };

  const availableIntegrations = [
    {
      name: 'SAP ERP',
      description: 'ERP sistemi entegrasyonu',
      icon: '🏢',
      category: 'ERP'
    },
    {
      name: 'Salesforce CRM',
      description: 'Müşteri ilişkileri yönetimi',
      icon: '👥',
      category: 'CRM'
    },
    {
      name: 'Microsoft Dynamics',
      description: 'İş süreçleri yönetimi',
      icon: '⚙️',
      category: 'ERP'
    },
    {
      name: 'Slack',
      description: 'Takım iletişimi',
      icon: '💬',
      category: 'Communication'
    }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'connected': return 'text-green-600 bg-green-50';
      case 'disconnected': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'connected': return CheckCircleIcon;
      case 'disconnected': return XCircleIcon;
      case 'error': return ExclamationTriangleIcon;
      default: return XCircleIcon;
    }
  };

  const connectIntegration = async (integration: any) => {
    await handleConnect(integration.id);
  };

  const configureIntegration = (integration: any) => {
    setSelectedIntegration(integration);
    setShowConfigModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Entegrasyonlar</h1>
          <p className="text-xl text-gray-600">Harici servislerle entegrasyonları yönetin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Bağlı Entegrasyonlar</p>
            <p className="text-3xl font-bold text-green-600">
              {loading ? '...' : integrations.filter(i => i.status === 'connected').length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Toplam Entegrasyon</p>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : integrations.length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Aylık Maliyet</p>
            <p className="text-3xl font-bold text-blue-600">
              {loading ? '...' : `$${integrations.reduce((sum, i) => sum + parseInt(i.cost.replace('$', '').replace('/month', '')), 0)}`}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Hata Durumunda</p>
            <p className="text-3xl font-bold text-red-600">
              {loading ? '...' : integrations.filter(i => i.status === 'error').length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'connected', label: 'Bağlı Entegrasyonlar', icon: '🔗' },
                { id: 'available', label: 'Mevcut Entegrasyonlar', icon: '➕' },
                { id: 'logs', label: 'Entegrasyon Logları', icon: '📊' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Connected Integrations Tab */}
            {activeTab === 'connected' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Bağlı Entegrasyonlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {integrations.map((integration) => {
                    const StatusIcon = getStatusIcon(integration.status);
                    return (
                      <div key={integration.id} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <span className="text-3xl mr-3">{integration.icon}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                              <p className="text-sm text-gray-600">{integration.description}</p>
                            </div>
                          </div>
                          <div className={`p-2 rounded-lg ${getStatusColor(integration.status)}`}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Kategori:</span>
                            <span className="font-medium">{integration.category}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Son Senkronizasyon:</span>
                            <span className="font-medium">{integration.lastSync}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Kullanım:</span>
                            <span className="font-medium">{integration.usage}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Maliyet:</span>
                            <span className="font-medium">{integration.cost}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => configureIntegration(integration)}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <CogIcon className="w-4 h-4 inline-block mr-1" />
                            Yapılandır
                          </button>
                          <button 
                            onClick={() => handleSync(integration.id)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Integrations Tab */}
            {activeTab === 'available' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Mevcut Entegrasyonlar</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableIntegrations.map((integration, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-colors">
                      <div className="flex items-center mb-4">
                        <span className="text-3xl mr-3">{integration.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          {integration.category}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => connectIntegration(integration)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <LinkIcon className="w-4 h-4 inline-block mr-1" />
                        Bağla
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Entegrasyon Logları</h2>
                <div className="space-y-4">
                  {[
                    { time: '2024-10-24 14:30:25', integration: 'Google Maps API', action: 'API Call', status: 'success', details: 'Geocoding request completed' },
                    { time: '2024-10-24 13:45:12', integration: 'E-Fatura (GİB)', action: 'Invoice Sync', status: 'success', details: '5 invoices synchronized' },
                    { time: '2024-10-24 12:15:30', integration: 'İyzico Payment', action: 'Payment Process', status: 'error', details: 'Payment gateway timeout' },
                    { time: '2024-10-24 11:30:45', integration: 'SendGrid Email', action: 'Email Send', status: 'success', details: 'Bulk email sent to 150 recipients' }
                  ].map((log, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-3 ${
                            log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="font-medium text-gray-900">{log.integration}</span>
                        </div>
                        <span className="text-sm text-gray-500">{log.time}</span>
                      </div>
                      <div className="ml-5 text-sm text-gray-600">
                        <p><strong>Action:</strong> {log.action}</p>
                        <p><strong>Details:</strong> {log.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Configuration Modal */}
        {showConfigModal && selectedIntegration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {selectedIntegration.name} Yapılandırması
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Anahtarı</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="API anahtarınızı girin"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gizli Anahtar</label>
                  <input
                    type="password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Gizli anahtarınızı girin"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://your-domain.com/webhook"
                  />
                </div>
                
                <div className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" defaultChecked />
                  <label className="ml-2 text-sm text-gray-700">Otomatik senkronizasyonu etkinleştir</label>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
