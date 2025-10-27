'use client';

import React, { useState } from 'react';
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const securityEvents = [
    {
      id: 1,
      type: 'login',
      user: 'Ahmet Yılmaz',
      ip: '192.168.1.100',
      location: 'Istanbul, Turkey',
      timestamp: '2024-10-24 14:30:25',
      status: 'success'
    },
    {
      id: 2,
      type: 'failed_login',
      user: 'admin@ayazlogistics.com',
      ip: '192.168.1.150',
      location: 'Ankara, Turkey',
      timestamp: '2024-10-24 13:45:12',
      status: 'failed'
    },
    {
      id: 3,
      type: 'password_change',
      user: 'Ayşe Demir',
      ip: '192.168.1.200',
      location: 'Izmir, Turkey',
      timestamp: '2024-10-24 12:15:30',
      status: 'success'
    },
    {
      id: 4,
      type: 'permission_change',
      user: 'Mehmet Kaya',
      ip: '192.168.1.75',
      location: 'Bursa, Turkey',
      timestamp: '2024-10-24 11:20:45',
      status: 'success'
    }
  ];

  const securityStats = [
    { label: 'Aktif Oturumlar', value: '12', color: 'text-blue-600' },
    { label: 'Başarısız Giriş Denemeleri', value: '3', color: 'text-red-600' },
    { label: 'Şifre Değişiklikleri', value: '5', color: 'text-green-600' },
    { label: 'Güvenlik Uyarıları', value: '1', color: 'text-yellow-600' }
  ];

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'login': return CheckCircleIcon;
      case 'failed_login': return ExclamationTriangleIcon;
      case 'password_change': return KeyIcon;
      case 'permission_change': return UserGroupIcon;
      default: return ClockIcon;
    }
  };

  const getEventColor = (type: string, status: string) => {
    if (status === 'failed') return 'text-red-600 bg-red-50';
    if (type === 'login') return 'text-green-600 bg-green-50';
    if (type === 'password_change') return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  const changePassword = () => {
    if (passwordData.newPassword === passwordData.confirmPassword) {
      // Here you would typically send the password change request to your backend
      console.log('Changing password...');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordModal(false);
      alert('Şifre başarıyla değiştirildi!');
    } else {
      alert('Yeni şifreler eşleşmiyor!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Güvenlik Merkezi</h1>
          <p className="text-xl text-gray-600">Sistem güvenliğini izleyin ve yönetin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {securityStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border p-6">
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Genel Bakış', icon: '🔍' },
                { id: 'events', label: 'Güvenlik Olayları', icon: '📊' },
                { id: 'sessions', label: 'Aktif Oturumlar', icon: '👥' },
                { id: 'settings', label: 'Güvenlik Ayarları', icon: '⚙️' }
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Güvenlik Durumu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center mb-4">
                      <ShieldCheckIcon className="w-8 h-8 text-green-600 mr-3" />
                      <h3 className="text-lg font-semibold text-green-900">Güvenlik Durumu: İyi</h3>
                    </div>
                    <p className="text-green-700 text-sm">
                      Sistem güvenliği aktif ve tüm kontroller başarılı. Son güvenlik taraması 2 saat önce tamamlandı.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center mb-4">
                      <LockClosedIcon className="w-8 h-8 text-blue-600 mr-3" />
                      <h3 className="text-lg font-semibold text-blue-900">Şifre Politikası</h3>
                    </div>
                    <p className="text-blue-700 text-sm">
                      Güçlü şifre politikası aktif. Minimum 8 karakter, büyük/küçük harf, rakam ve özel karakter gereklidir.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Son Güvenlik Olayları</h2>
                <div className="space-y-4">
                  {securityEvents.map((event) => {
                    const Icon = getEventIcon(event.type);
                    return (
                      <div key={event.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg mr-3 ${getEventColor(event.type, event.status)}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {event.type.replace('_', ' ').toUpperCase()}
                              </h3>
                              <p className="text-sm text-gray-600">{event.user}</p>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">{event.timestamp}</span>
                        </div>
                        <div className="ml-12 text-sm text-gray-600">
                          <p>IP: {event.ip} | Konum: {event.location}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Aktif Oturumlar</h2>
                <div className="space-y-4">
                  {[
                    { user: 'Ahmet Yılmaz', device: 'Chrome on Windows', location: 'Istanbul, Turkey', ip: '192.168.1.100', lastActivity: 'Şu anda aktif' },
                    { user: 'Ayşe Demir', device: 'Safari on iPhone', location: 'Ankara, Turkey', ip: '192.168.1.150', lastActivity: '5 dakika önce' },
                    { user: 'Mehmet Kaya', device: 'Firefox on Mac', location: 'Izmir, Turkey', ip: '192.168.1.200', lastActivity: '1 saat önce' }
                  ].map((session, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold">
                              {session.user.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{session.user}</h3>
                            <p className="text-sm text-gray-600">{session.device}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-gray-500">{session.lastActivity}</span>
                        </div>
                      </div>
                      <div className="ml-13 text-sm text-gray-600">
                        <p>IP: {session.ip} | Konum: {session.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Güvenlik Ayarları</h2>
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Şifre Güvenliği</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Şifre Değiştir</p>
                          <p className="text-sm text-gray-600">Hesabınızın şifresini güncelleyin</p>
                        </div>
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Şifre Değiştir
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">İki Faktörlü Kimlik Doğrulama (2FA)</p>
                          <p className="text-sm text-gray-600">Ekstra güvenlik katmanı ekleyin</p>
                        </div>
                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                          2FA Etkinleştir
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Oturum Yönetimi</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Otomatik Oturum Kapatma</p>
                          <p className="text-sm text-gray-600">30 dakika hareketsizlik sonrası oturumu kapat</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Çoklu Oturum Kontrolü</p>
                          <p className="text-sm text-gray-600">Aynı anda birden fazla cihazdan giriş yapılmasını engelle</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Şifre Değiştir</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={changePassword}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Şifre Değiştir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

