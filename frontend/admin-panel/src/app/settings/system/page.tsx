'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Database, Server, Globe, Shield, Bell } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

export default function SystemConfigPage() {
  const { hasPermission } = useAuth();
  const [config, setConfig] = useState({
    general: {
      companyName: 'Ayaz Logistics',
      companyEmail: 'info@ayazlogistics.com',
      companyPhone: '+90 212 555 0123',
      timezone: 'Europe/Istanbul',
      language: 'tr',
      currency: 'TRY'
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'ayazlogistics',
      ssl: true,
      connectionPool: 20
    },
    api: {
      baseUrl: 'https://api.ayazlogistics.com',
      version: 'v1',
      timeout: 30000,
      retryAttempts: 3
    },
    security: {
      sessionTimeout: 30,
      passwordMinLength: 8,
      requireTwoFactor: false,
      maxLoginAttempts: 5,
      lockoutDuration: 15
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      webhookUrl: '',
      alertThresholds: {
        lowStock: 10,
        highTemperature: 30,
        maintenanceDue: 7
      }
    }
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In real implementation, fetch from API
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const configSections = [
    {
      id: 'general',
      title: 'Genel Ayarlar',
      icon: Settings,
      color: 'from-blue-500 to-cyan-500',
      fields: [
        { key: 'companyName', label: 'Şirket Adı', type: 'text' },
        { key: 'companyEmail', label: 'E-posta', type: 'email' },
        { key: 'companyPhone', label: 'Telefon', type: 'tel' },
        { key: 'timezone', label: 'Saat Dilimi', type: 'select', options: ['Europe/Istanbul', 'UTC', 'America/New_York'] },
        { key: 'language', label: 'Dil', type: 'select', options: ['tr', 'en', 'de'] },
        { key: 'currency', label: 'Para Birimi', type: 'select', options: ['TRY', 'USD', 'EUR'] }
      ]
    },
    {
      id: 'database',
      title: 'Veritabanı Ayarları',
      icon: Database,
      color: 'from-green-500 to-emerald-500',
      fields: [
        { key: 'host', label: 'Host', type: 'text' },
        { key: 'port', label: 'Port', type: 'number' },
        { key: 'name', label: 'Veritabanı Adı', type: 'text' },
        { key: 'ssl', label: 'SSL Kullan', type: 'checkbox' },
        { key: 'connectionPool', label: 'Bağlantı Havuzu', type: 'number' }
      ]
    },
    {
      id: 'api',
      title: 'API Ayarları',
      icon: Server,
      color: 'from-purple-500 to-pink-500',
      fields: [
        { key: 'baseUrl', label: 'Base URL', type: 'url' },
        { key: 'version', label: 'Versiyon', type: 'text' },
        { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
        { key: 'retryAttempts', label: 'Yeniden Deneme', type: 'number' }
      ]
    },
    {
      id: 'security',
      title: 'Güvenlik Ayarları',
      icon: Shield,
      color: 'from-red-500 to-orange-500',
      fields: [
        { key: 'sessionTimeout', label: 'Oturum Süresi (dakika)', type: 'number' },
        { key: 'passwordMinLength', label: 'Min Şifre Uzunluğu', type: 'number' },
        { key: 'requireTwoFactor', label: '2FA Zorunlu', type: 'checkbox' },
        { key: 'maxLoginAttempts', label: 'Max Giriş Denemesi', type: 'number' },
        { key: 'lockoutDuration', label: 'Kilitleme Süresi (dakika)', type: 'number' }
      ]
    },
    {
      id: 'notifications',
      title: 'Bildirim Ayarları',
      icon: Bell,
      color: 'from-yellow-500 to-orange-500',
      fields: [
        { key: 'emailEnabled', label: 'E-posta Bildirimleri', type: 'checkbox' },
        { key: 'smsEnabled', label: 'SMS Bildirimleri', type: 'checkbox' },
        { key: 'pushEnabled', label: 'Push Bildirimleri', type: 'checkbox' },
        { key: 'webhookUrl', label: 'Webhook URL', type: 'url' }
      ]
    }
  ];

  if (!hasPermission('manage_settings')) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h2>
          <p className="text-gray-600">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistem Konfigürasyonu</h1>
        <p className="text-gray-600">Sistem ayarlarını yönetin ve konfigüre edin</p>
      </div>

      {/* Save Button */}
      <div className="mb-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>{loading ? 'Kaydediliyor...' : 'Kaydet'}</span>
        </button>
        {saved && (
          <div className="ml-4 flex items-center text-green-600">
            <span className="text-sm font-medium">Kaydedildi!</span>
          </div>
        )}
      </div>

      {/* Configuration Sections */}
      <div className="space-y-8">
        {configSections.map((section) => {
          const Icon = section.icon;
          const sectionData = config[section.id as keyof typeof config];
          
          return (
            <div key={section.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className={`bg-gradient-to-r ${section.color} p-6`}>
                <div className="flex items-center space-x-3">
                  <Icon className="w-8 h-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      
                      {field.type === 'text' || field.type === 'email' || field.type === 'tel' || field.type === 'url' ? (
                        <input
                          type={field.type}
                          value={sectionData[field.key as keyof typeof sectionData] as string}
                          onChange={(e) => handleInputChange(section.id, field.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : field.type === 'number' ? (
                        <input
                          type="number"
                          value={sectionData[field.key as keyof typeof sectionData] as number}
                          onChange={(e) => handleInputChange(section.id, field.key, parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : field.type === 'select' ? (
                        <select
                          value={sectionData[field.key as keyof typeof sectionData] as string}
                          onChange={(e) => handleInputChange(section.id, field.key, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.type === 'checkbox' ? (
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={sectionData[field.key as keyof typeof sectionData] as boolean}
                            onChange={(e) => handleInputChange(section.id, field.key, e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Aktif</span>
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Status */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Sistem Durumu</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">Veritabanı: Aktif</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">API: Aktif</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-900">Bildirimler: Kısmi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
