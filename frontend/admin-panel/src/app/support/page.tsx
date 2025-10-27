'use client';

import React, { useState } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PhoneIcon, 
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState('tickets');
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: ''
  });

  const tickets = [
    {
      id: 'TKT-001',
      subject: 'Sistem giriş sorunu',
      category: 'Technical',
      priority: 'high',
      status: 'open',
      createdAt: '2024-10-24 14:30',
      lastUpdate: '2024-10-24 15:45'
    },
    {
      id: 'TKT-002',
      subject: 'Rapor oluşturma hatası',
      category: 'Bug Report',
      priority: 'medium',
      status: 'in-progress',
      createdAt: '2024-10-23 10:15',
      lastUpdate: '2024-10-24 09:30'
    },
    {
      id: 'TKT-003',
      subject: 'Yeni özellik talebi',
      category: 'Feature Request',
      priority: 'low',
      status: 'resolved',
      createdAt: '2024-10-22 16:20',
      lastUpdate: '2024-10-24 11:00'
    }
  ];

  const supportStats = [
    { label: 'Açık Biletler', value: '12', color: 'text-red-600' },
    { label: 'İşlemde', value: '8', color: 'text-yellow-600' },
    { label: 'Çözüldü', value: '45', color: 'text-green-600' },
    { label: 'Ortalama Yanıt Süresi', value: '2.5 saat', color: 'text-blue-600' }
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const createTicket = () => {
    if (newTicket.subject && newTicket.category && newTicket.description) {
      // Here you would typically send the ticket to your backend
      console.log('Creating ticket:', newTicket);
      setNewTicket({ subject: '', category: '', priority: 'medium', description: '' });
      alert('Bilet başarıyla oluşturuldu!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Destek Merkezi</h1>
          <p className="text-xl text-gray-600">Teknik destek ve yardım için buradayız</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {supportStats.map((stat, index) => (
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
                { id: 'tickets', label: 'Biletlerim', icon: '🎫' },
                { id: 'create', label: 'Yeni Bilet', icon: '➕' },
                { id: 'contact', label: 'İletişim', icon: '📞' }
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
            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Biletlerim</h2>
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div className="flex items-center space-x-4">
                          <span>#{ticket.id}</span>
                          <span>{ticket.category}</span>
                          <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority.toUpperCase()} Priority
                          </span>
                        </div>
                        <div className="text-right">
                          <div>Oluşturuldu: {ticket.createdAt}</div>
                          <div>Son güncelleme: {ticket.lastUpdate}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create Ticket Tab */}
            {activeTab === 'create' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Destek Bileti</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Konu</label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Sorununuzu kısaca açıklayın"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                      <select
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Kategori seçin</option>
                        <option value="Technical">Teknik Sorun</option>
                        <option value="Bug Report">Hata Bildirimi</option>
                        <option value="Feature Request">Özellik Talebi</option>
                        <option value="General">Genel</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Öncelik</label>
                      <select
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                    <textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Sorununuzu detaylı olarak açıklayın..."
                    />
                  </div>
                  
                  <button
                    onClick={createTicket}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    Bilet Oluştur
                  </button>
                </div>
              </div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">İletişim Bilgileri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <PhoneIcon className="w-8 h-8 text-blue-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Telefon Desteği</h3>
                    <p className="text-gray-600 mb-4">7/24 teknik destek hattımız</p>
                    <p className="text-2xl font-bold text-blue-600">+90 212 555 0123</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-xl p-6">
                    <EnvelopeIcon className="w-8 h-8 text-green-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">E-posta Desteği</h3>
                    <p className="text-gray-600 mb-4">Detaylı sorularınız için</p>
                    <p className="text-xl font-bold text-green-600">destek@ayazlogistics.com</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-xl p-6">
                    <ChatBubbleLeftRightIcon className="w-8 h-8 text-purple-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Canlı Destek</h3>
                    <p className="text-gray-600 mb-4">Anlık yardım için</p>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Sohbet Başlat
                    </button>
                  </div>
                  
                  <div className="bg-orange-50 rounded-xl p-6">
                    <ClockIcon className="w-8 h-8 text-orange-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Çalışma Saatleri</h3>
                    <p className="text-gray-600 mb-2">Pazartesi - Cuma: 09:00 - 18:00</p>
                    <p className="text-gray-600">Cumartesi: 09:00 - 14:00</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

