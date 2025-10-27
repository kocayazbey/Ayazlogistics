'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Filter,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Pause,
  Play
} from 'lucide-react';

export default function MonitoringAlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const alerts = [
    {
      id: 'ALT001',
      name: 'Yüksek CPU Kullanımı',
      description: 'Sunucu CPU kullanımı %90 üzerine çıktı',
      severity: 'high',
      status: 'active',
      source: 'Server-01',
      triggeredAt: '2024-01-27 14:30:25',
      acknowledgedBy: 'Ahmet Yılmaz',
      acknowledgedAt: '2024-01-27 14:35:10',
      resolvedAt: null,
      condition: 'CPU > 90%',
      threshold: '90%',
      currentValue: '95%',
      duration: '5 dakika'
    },
    {
      id: 'ALT002',
      name: 'Düşük Disk Alanı',
      description: 'Disk kullanımı %85 üzerine çıktı',
      severity: 'medium',
      status: 'resolved',
      source: 'Database-01',
      triggeredAt: '2024-01-27 13:15:40',
      acknowledgedBy: 'Mehmet Kaya',
      acknowledgedAt: '2024-01-27 13:20:15',
      resolvedAt: '2024-01-27 13:45:30',
      condition: 'Disk > 85%',
      threshold: '85%',
      currentValue: '78%',
      duration: '30 dakika'
    },
    {
      id: 'ALT003',
      name: 'API Yanıt Süresi',
      description: 'API yanıt süresi 5 saniyeyi aştı',
      severity: 'low',
      status: 'active',
      source: 'API-Gateway',
      triggeredAt: '2024-01-27 14:25:10',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      condition: 'Response Time > 5s',
      threshold: '5 saniye',
      currentValue: '7.2 saniye',
      duration: '10 dakika'
    },
    {
      id: 'ALT004',
      name: 'Veritabanı Bağlantı Hatası',
      description: 'Veritabanı bağlantısı kurulamadı',
      severity: 'critical',
      status: 'active',
      source: 'Database-02',
      triggeredAt: '2024-01-27 14:40:15',
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      condition: 'DB Connection Failed',
      threshold: '0 bağlantı',
      currentValue: '0 bağlantı',
      duration: '2 dakika'
    }
  ];

  const alertRules = [
    {
      id: 'RULE001',
      name: 'CPU Kullanım Uyarısı',
      condition: 'CPU kullanımı > 90%',
      severity: 'high',
      enabled: true,
      lastTriggered: '2024-01-27 14:30:25',
      triggerCount: 5
    },
    {
      id: 'RULE002',
      name: 'Disk Alan Uyarısı',
      condition: 'Disk kullanımı > 85%',
      severity: 'medium',
      enabled: true,
      lastTriggered: '2024-01-27 13:15:40',
      triggerCount: 3
    },
    {
      id: 'RULE003',
      name: 'API Yanıt Süresi',
      condition: 'API yanıt süresi > 5s',
      severity: 'low',
      enabled: true,
      lastTriggered: '2024-01-27 14:25:10',
      triggerCount: 12
    },
    {
      id: 'RULE004',
      name: 'Veritabanı Bağlantısı',
      condition: 'DB bağlantı sayısı = 0',
      severity: 'critical',
      enabled: false,
      lastTriggered: '2024-01-27 14:40:15',
      triggerCount: 1
    }
  ];

  const statusFilters = [
    { name: 'Tümü', value: 'all', count: 8 },
    { name: 'Aktif', value: 'active', count: 3 },
    { name: 'Çözüldü', value: 'resolved', count: 4 },
    { name: 'Beklemede', value: 'pending', count: 1 }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'Kritik';
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktif';
      case 'resolved':
        return 'Çözüldü';
      case 'pending':
        return 'Beklemede';
      default:
        return 'Bilinmiyor';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        alert.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Uyarı Yönetimi</h1>
          <p className="text-gray-600">Sistem uyarılarını izleyin ve yönetin</p>
        </div>

        {/* Alert Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-sm text-red-600 font-medium">3</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Aktif Uyarı</div>
            <div className="text-sm text-gray-600">Şu anda çözülmeyi bekleyen</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm text-green-600 font-medium">4</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Çözüldü</div>
            <div className="text-sm text-gray-600">Son 24 saatte</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
              <div className="text-sm text-orange-600 font-medium">1</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Kritik</div>
            <div className="text-sm text-gray-600">Acil müdahale gerekli</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Settings className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm text-blue-600 font-medium">4</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Kural</div>
            <div className="text-sm text-gray-600">Aktif uyarı kuralları</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Uyarı adı, açıklama veya kaynak ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="lg:w-48">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {statusFilters.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.name} ({status.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Kural
              </button>
              <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </button>
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Aktif Uyarılar</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uyarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Önem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kaynak
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tetiklenme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Süre
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
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{alert.name}</div>
                        <div className="text-sm text-gray-500">{alert.description}</div>
                        <div className="text-xs text-gray-400">#{alert.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                        {getSeverityText(alert.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alert.source}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alert.triggeredAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {alert.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                        {getStatusText(alert.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors">
                          <Pause className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alert Rules */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Uyarı Kuralları</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {alertRules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                      <p className="text-sm text-gray-600">{rule.condition}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(rule.severity)}`}>
                        {getSeverityText(rule.severity)}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.enabled ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Son Tetiklenme:</span>
                      <span className="text-gray-900">{rule.lastTriggered}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tetiklenme Sayısı:</span>
                      <span className="text-gray-900">{rule.triggerCount}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Düzenle
                    </button>
                    <button className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                      rule.enabled 
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}>
                      {rule.enabled ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Devre Dışı
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Etkinleştir
                        </>
                      )}
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
        </div>
      </div>
    </div>
  );
}
