'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Settings,
  Bell,
  Download,
  Upload,
  Trash2,
  Edit
} from 'lucide-react';

export default function SettingsSecurityPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('authentication');

  const securitySettings = {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      expiryDays: 90
    },
    twoFactor: {
      enabled: true,
      method: 'SMS',
      backupCodes: 5
    },
    session: {
      timeout: 30,
      maxConcurrent: 3,
      rememberMe: true
    }
  };

  const securityEvents = [
    {
      id: 'EVT001',
      type: 'login',
      user: 'admin@ayazlogistics.com',
      ip: '192.168.1.100',
      location: 'İstanbul, Türkiye',
      timestamp: '2024-01-27 14:30:25',
      status: 'success',
      details: 'Başarılı giriş'
    },
    {
      id: 'EVT002',
      type: 'failed_login',
      user: 'admin@ayazlogistics.com',
      ip: '192.168.1.101',
      location: 'Ankara, Türkiye',
      timestamp: '2024-01-27 13:45:12',
      status: 'failed',
      details: 'Yanlış şifre'
    },
    {
      id: 'EVT003',
      type: 'password_change',
      user: 'ahmet.yilmaz@ayazlogistics.com',
      ip: '192.168.1.102',
      location: 'İzmir, Türkiye',
      timestamp: '2024-01-27 12:15:30',
      status: 'success',
      details: 'Şifre değiştirildi'
    },
    {
      id: 'EVT004',
      type: 'permission_change',
      user: 'admin@ayazlogistics.com',
      ip: '192.168.1.100',
      location: 'İstanbul, Türkiye',
      timestamp: '2024-01-27 11:20:45',
      status: 'success',
      details: 'Kullanıcı izinleri güncellendi'
    }
  ];

  const activeSessions = [
    {
      id: 'SES001',
      user: 'admin@ayazlogistics.com',
      device: 'Chrome - Windows 10',
      ip: '192.168.1.100',
      location: 'İstanbul, Türkiye',
      lastActivity: '2024-01-27 14:30:25',
      status: 'active'
    },
    {
      id: 'SES002',
      user: 'ahmet.yilmaz@ayazlogistics.com',
      device: 'Safari - macOS',
      ip: '192.168.1.103',
      location: 'Ankara, Türkiye',
      lastActivity: '2024-01-27 13:45:12',
      status: 'active'
    },
    {
      id: 'SES003',
      user: 'mehmet.kaya@ayazlogistics.com',
      device: 'Firefox - Linux',
      ip: '192.168.1.104',
      location: 'İzmir, Türkiye',
      lastActivity: '2024-01-27 12:15:30',
      status: 'idle'
    }
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login':
        return CheckCircle;
      case 'failed_login':
        return AlertTriangle;
      case 'password_change':
        return Key;
      case 'permission_change':
        return Users;
      default:
        return Shield;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'text-green-600';
      case 'failed_login':
        return 'text-red-600';
      case 'password_change':
        return 'text-blue-600';
      case 'permission_change':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'idle':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Başarılı';
      case 'failed':
        return 'Başarısız';
      case 'active':
        return 'Aktif';
      case 'idle':
        return 'Boşta';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Güvenlik Ayarları</h1>
          <p className="text-gray-600">Sistem güvenliğini yönetin ve izleyin</p>
        </div>

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-sm text-green-600 font-medium">Güvenli</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Sistem Durumu</div>
            <div className="text-sm text-gray-600">Tüm güvenlik kontrolleri aktif</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-sm text-blue-600 font-medium">3</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Aktif Oturum</div>
            <div className="text-sm text-gray-600">Şu anda çevrimiçi kullanıcılar</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-sm text-yellow-600 font-medium">2</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">Güvenlik Uyarısı</div>
            <div className="text-sm text-gray-600">Son 24 saatte</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Lock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-sm text-purple-600 font-medium">Aktif</div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">2FA</div>
            <div className="text-sm text-gray-600">İki faktörlü kimlik doğrulama</div>
          </div>
        </div>

        {/* Security Settings Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-8">
              {[
                { id: 'authentication', name: 'Kimlik Doğrulama', icon: Key },
                { id: 'sessions', name: 'Oturum Yönetimi', icon: Clock },
                { id: 'permissions', name: 'İzinler', icon: Users },
                { id: 'audit', name: 'Denetim Kayıtları', icon: Shield }
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
            {/* Authentication Settings */}
            {activeTab === 'authentication' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Kimlik Doğrulama Ayarları</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900">Şifre Politikası</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Minimum uzunluk</span>
                        <span className="font-medium">{securitySettings.passwordPolicy.minLength} karakter</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Büyük harf zorunlu</span>
                        <span className={`font-medium ${securitySettings.passwordPolicy.requireUppercase ? 'text-green-600' : 'text-red-600'}`}>
                          {securitySettings.passwordPolicy.requireUppercase ? 'Evet' : 'Hayır'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Küçük harf zorunlu</span>
                        <span className={`font-medium ${securitySettings.passwordPolicy.requireLowercase ? 'text-green-600' : 'text-red-600'}`}>
                          {securitySettings.passwordPolicy.requireLowercase ? 'Evet' : 'Hayır'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rakam zorunlu</span>
                        <span className={`font-medium ${securitySettings.passwordPolicy.requireNumbers ? 'text-green-600' : 'text-red-600'}`}>
                          {securitySettings.passwordPolicy.requireNumbers ? 'Evet' : 'Hayır'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Özel karakter zorunlu</span>
                        <span className={`font-medium ${securitySettings.passwordPolicy.requireSpecialChars ? 'text-green-600' : 'text-red-600'}`}>
                          {securitySettings.passwordPolicy.requireSpecialChars ? 'Evet' : 'Hayır'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Şifre geçerlilik süresi</span>
                        <span className="font-medium">{securitySettings.passwordPolicy.expiryDays} gün</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900">İki Faktörlü Kimlik Doğrulama</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Durum</span>
                        <span className={`font-medium ${securitySettings.twoFactor.enabled ? 'text-green-600' : 'text-red-600'}`}>
                          {securitySettings.twoFactor.enabled ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Yöntem</span>
                        <span className="font-medium">{securitySettings.twoFactor.method}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Yedek kodlar</span>
                        <span className="font-medium">{securitySettings.twoFactor.backupCodes} adet</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Ayarları Güncelle
                  </button>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Şifre Sıfırla
                  </button>
                </div>
              </div>
            )}

            {/* Sessions Management */}
            {activeTab === 'sessions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Aktif Oturumlar</h3>
                
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {session.user.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{session.user}</div>
                          <div className="text-sm text-gray-500">{session.device}</div>
                          <div className="text-xs text-gray-400">{session.ip} • {session.location}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-900">{session.lastActivity}</div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                          {getStatusText(session.status)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Logs */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Güvenlik Olayları</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Olay
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kullanıcı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          IP Adresi
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Konum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tarih
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Durum
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {securityEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`p-2 rounded-lg ${getEventColor(event.type)}`}>
                                {React.createElement(getEventIcon(event.type), { className: "w-4 h-4" })}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{event.details}</div>
                                <div className="text-sm text-gray-500">#{event.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {event.user}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {event.ip}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {event.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {event.timestamp}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                              {getStatusText(event.status)}
                            </span>
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
