'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Plus
} from 'lucide-react';

export default function CRMLeadsPage() {
  const [selectedLead, setSelectedLead] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const leads = [
    {
      id: 'LD001',
      name: 'ABC Teknoloji A.Ş.',
      contact: 'Mehmet Yılmaz',
      email: 'mehmet@abcteknoloji.com',
      phone: '+90 212 123 4567',
      company: 'ABC Teknoloji A.Ş.',
      industry: 'Teknoloji',
      source: 'Web Sitesi',
      status: 'new',
      priority: 'high',
      value: 150000,
      location: 'İstanbul',
      assignedTo: 'Ahmet Kaya',
      createdDate: '2024-01-25',
      lastContact: '2024-01-27',
      notes: 'Depo ihtiyacı var, hızlı karar verebilir'
    },
    {
      id: 'LD002',
      name: 'XYZ Lojistik Ltd.',
      contact: 'Fatma Demir',
      email: 'fatma@xyzltd.com',
      phone: '+90 216 234 5678',
      company: 'XYZ Lojistik Ltd.',
      industry: 'Lojistik',
      source: 'Referans',
      status: 'contacted',
      priority: 'medium',
      value: 85000,
      location: 'Ankara',
      assignedTo: 'Zeynep Özkan',
      createdDate: '2024-01-20',
      lastContact: '2024-01-26',
      notes: 'Fiyat teklifi gönderildi, geri dönüş bekleniyor'
    },
    {
      id: 'LD003',
      name: 'DEF Gıda San.',
      contact: 'Ali Yıldız',
      email: 'ali@defgida.com',
      phone: '+90 232 345 6789',
      company: 'DEF Gıda San.',
      industry: 'Gıda',
      source: 'Sosyal Medya',
      status: 'qualified',
      priority: 'high',
      value: 200000,
      location: 'İzmir',
      assignedTo: 'Mehmet Kaya',
      createdDate: '2024-01-15',
      lastContact: '2024-01-25',
      notes: 'Soğuk zincir lojistiği için özel çözüm gerekli'
    },
    {
      id: 'LD004',
      name: 'GHI İnşaat Ltd.',
      contact: 'Ayşe Kaya',
      email: 'ayse@ghiinsaat.com',
      phone: '+90 312 456 7890',
      company: 'GHI İnşaat Ltd.',
      industry: 'İnşaat',
      source: 'Telefon',
      status: 'proposal',
      priority: 'low',
      value: 120000,
      location: 'Ankara',
      assignedTo: 'Ahmet Kaya',
      createdDate: '2024-01-10',
      lastContact: '2024-01-24',
      notes: 'Teklif hazırlandı, sunum yapılacak'
    }
  ];

  const statusFilters = [
    { name: 'Tümü', value: 'all', count: 24 },
    { name: 'Yeni', value: 'new', count: 8 },
    { name: 'İletişim Kuruldu', value: 'contacted', count: 6 },
    { name: 'Nitelikli', value: 'qualified', count: 5 },
    { name: 'Teklif', value: 'proposal', count: 3 },
    { name: 'Kazanıldı', value: 'won', count: 2 }
  ];

  const leadMetrics = [
    {
      metric: 'Toplam Potansiyel',
      value: '24',
      change: '+3',
      trend: 'up',
      icon: Users
    },
    {
      metric: 'Bu Ay Yeni',
      value: '8',
      change: '+2',
      trend: 'up',
      icon: UserPlus
    },
    {
      metric: 'Dönüşüm Oranı',
      value: '32%',
      change: '+5%',
      trend: 'up',
      icon: Target
    },
    {
      metric: 'Toplam Değer',
      value: '₺2.1M',
      change: '+15%',
      trend: 'up',
      icon: TrendingUp
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-green-100 text-green-800';
      case 'proposal':
        return 'bg-purple-100 text-purple-800';
      case 'won':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'Yeni';
      case 'contacted':
        return 'İletişim Kuruldu';
      case 'qualified':
        return 'Nitelikli';
      case 'proposal':
        return 'Teklif';
      case 'won':
        return 'Kazanıldı';
      case 'lost':
        return 'Kaybedildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lead.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        lead.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Potansiyel Müşteriler</h1>
          <p className="text-gray-600">Lead'leri yönetin ve takip edin</p>
        </div>

        {/* Lead Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {leadMetrics.map((metric, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <metric.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center text-sm ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${metric.trend === 'down' ? 'rotate-180' : ''}`} />
                  {metric.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.metric}</div>
            </div>
          ))}
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
                  placeholder="Şirket, kişi veya not ile ara..."
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
                Yeni Lead
              </button>
              <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </button>
            </div>
          </div>
        </div>

        {/* Lead List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Lead Listesi</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şirket/Kişi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Değer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Öncelik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atanan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son İletişim
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.contact}</div>
                        <div className="text-xs text-gray-400">{lead.industry} • {lead.source}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{lead.email}</div>
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                      <div className="text-xs text-gray-400 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {lead.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">₺{lead.value.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {getStatusText(lead.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.priority)}`}>
                        {getPriorityText(lead.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.assignedTo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.lastContact).toLocaleDateString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Details */}
        {selectedLead && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Lead Detayları: {selectedLead.name}</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Info */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">İletişim Bilgileri</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="text-sm text-gray-900">{selectedLead.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="text-sm text-gray-900">{selectedLead.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="text-sm text-gray-900">{selectedLead.location}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                      <span className="text-sm text-gray-900">Oluşturulma: {new Date(selectedLead.createdDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                {/* Lead Info */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Lead Bilgileri</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Şirket:</span>
                      <span className="font-medium">{selectedLead.company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sektör:</span>
                      <span className="font-medium">{selectedLead.industry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kaynak:</span>
                      <span className="font-medium">{selectedLead.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Değer:</span>
                      <span className="font-medium">₺{selectedLead.value.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Atanan:</span>
                      <span className="font-medium">{selectedLead.assignedTo}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Notlar</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{selectedLead.notes}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Düzenle
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  İletişim Kur
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Teklif Gönder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
