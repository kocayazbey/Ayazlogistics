'use client';

import React, { useState } from 'react';
import { 
  Target, 
  TrendingUp, 
  Calendar,
  DollarSign,
  Percent,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  Users,
  Phone,
  Mail,
  MapPin,
  Filter,
  Search,
  Plus
} from 'lucide-react';

export default function CRMOpportunitiesPage() {
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [filterStage, setFilterStage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const opportunities = [
    {
      id: 'OPP001',
      name: 'ABC Teknoloji - Depo Hizmetleri',
      company: 'ABC Teknoloji A.Ş.',
      contact: 'Mehmet Yılmaz',
      value: 150000,
      probability: 75,
      stage: 'proposal',
      expectedClose: '2024-02-15',
      assignedTo: 'Ahmet Kaya',
      source: 'Lead',
      createdDate: '2024-01-15',
      lastActivity: '2024-01-27',
      description: 'Teknoloji şirketi için depo hizmetleri, 3 yıllık sözleşme',
      nextAction: 'Teklif sunumu yapılacak',
      competitors: ['XYZ Lojistik', 'DEF Kargo']
    },
    {
      id: 'OPP002',
      name: 'XYZ Lojistik - Soğuk Zincir',
      company: 'XYZ Lojistik Ltd.',
      contact: 'Fatma Demir',
      value: 200000,
      probability: 60,
      stage: 'negotiation',
      expectedClose: '2024-03-01',
      assignedTo: 'Zeynep Özkan',
      source: 'Referans',
      createdDate: '2024-01-10',
      lastActivity: '2024-01-26',
      description: 'Soğuk zincir lojistiği için özel çözüm',
      nextAction: 'Fiyat görüşmeleri devam ediyor',
      competitors: ['GHI Soğuk', 'JKL Lojistik']
    },
    {
      id: 'OPP003',
      name: 'DEF Gıda - Dağıtım Ağı',
      company: 'DEF Gıda San.',
      contact: 'Ali Yıldız',
      value: 300000,
      probability: 40,
      stage: 'qualification',
      expectedClose: '2024-04-30',
      assignedTo: 'Mehmet Kaya',
      source: 'Web Sitesi',
      createdDate: '2024-01-05',
      lastActivity: '2024-01-25',
      description: 'Türkiye geneli dağıtım ağı kurulumu',
      nextAction: 'İhtiyaç analizi tamamlanacak',
      competitors: ['MNO Lojistik', 'PQR Kargo']
    },
    {
      id: 'OPP004',
      name: 'GHI İnşaat - Malzeme Taşıma',
      company: 'GHI İnşaat Ltd.',
      contact: 'Ayşe Kaya',
      value: 120000,
      probability: 90,
      stage: 'closed-won',
      expectedClose: '2024-01-30',
      assignedTo: 'Ahmet Kaya',
      source: 'Telefon',
      createdDate: '2023-12-20',
      lastActivity: '2024-01-24',
      description: 'İnşaat malzemeleri taşıma hizmetleri',
      nextAction: 'Sözleşme imzalandı',
      competitors: ['STU Taşıma', 'VWX Lojistik']
    }
  ];

  const stageFilters = [
    { name: 'Tümü', value: 'all', count: 12 },
    { name: 'Niteliklendirme', value: 'qualification', count: 3 },
    { name: 'Teklif', value: 'proposal', count: 4 },
    { name: 'Görüşme', value: 'negotiation', count: 3 },
    { name: 'Kazanıldı', value: 'closed-won', count: 2 }
  ];

  const opportunityMetrics = [
    {
      metric: 'Toplam Fırsat',
      value: '12',
      change: '+2',
      trend: 'up',
      icon: Target
    },
    {
      metric: 'Toplam Değer',
      value: '₺2.1M',
      change: '+25%',
      trend: 'up',
      icon: DollarSign
    },
    {
      metric: 'Ortalama Olasılık',
      value: '68%',
      change: '+8%',
      trend: 'up',
      icon: Percent
    },
    {
      metric: 'Bu Ay Kapanan',
      value: '3',
      change: '+1',
      trend: 'up',
      icon: CheckCircle
    }
  ];

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'qualification':
        return 'bg-blue-100 text-blue-800';
      case 'proposal':
        return 'bg-yellow-100 text-yellow-800';
      case 'negotiation':
        return 'bg-orange-100 text-orange-800';
      case 'closed-won':
        return 'bg-green-100 text-green-800';
      case 'closed-lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageText = (stage: string) => {
    switch (stage) {
      case 'qualification':
        return 'Niteliklendirme';
      case 'proposal':
        return 'Teklif';
      case 'negotiation':
        return 'Görüşme';
      case 'closed-won':
        return 'Kazanıldı';
      case 'closed-lost':
        return 'Kaybedildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600';
    if (probability >= 60) return 'text-yellow-600';
    if (probability >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        opp.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        opp.contact.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = filterStage === 'all' || opp.stage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Satış Fırsatları</h1>
          <p className="text-gray-600">Satış fırsatlarını yönetin ve takip edin</p>
        </div>

        {/* Opportunity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {opportunityMetrics.map((metric, index) => (
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
                  placeholder="Fırsat, şirket veya kişi ile ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Stage Filter */}
            <div className="lg:w-48">
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {stageFilters.map(stage => (
                  <option key={stage.value} value={stage.value}>
                    {stage.name} ({stage.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Yeni Fırsat
              </button>
              <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </button>
            </div>
          </div>
        </div>

        {/* Opportunity List */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Fırsat Listesi</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fırsat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şirket/Kişi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Değer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Olasılık
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aşama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beklenen Kapanış
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atanan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOpportunities.map((opportunity) => (
                  <tr key={opportunity.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOpportunity(opportunity)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{opportunity.name}</div>
                        <div className="text-sm text-gray-500">{opportunity.description}</div>
                        <div className="text-xs text-gray-400">#{opportunity.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{opportunity.company}</div>
                      <div className="text-sm text-gray-500">{opportunity.contact}</div>
                      <div className="text-xs text-gray-400">{opportunity.source}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">₺{opportunity.value.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${opportunity.probability}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-medium ${getProbabilityColor(opportunity.probability)}`}>
                          {opportunity.probability}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stage)}`}>
                        {getStageText(opportunity.stage)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(opportunity.expectedClose).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {opportunity.assignedTo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Opportunity Details */}
        {selectedOpportunity && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Fırsat Detayları: {selectedOpportunity.name}</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Opportunity Info */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Fırsat Bilgileri</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Şirket:</span>
                      <span className="font-medium">{selectedOpportunity.company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">İletişim:</span>
                      <span className="font-medium">{selectedOpportunity.contact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Değer:</span>
                      <span className="font-medium">₺{selectedOpportunity.value.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Olasılık:</span>
                      <span className={`font-medium ${getProbabilityColor(selectedOpportunity.probability)}`}>
                        {selectedOpportunity.probability}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Aşama:</span>
                      <span className="font-medium">{getStageText(selectedOpportunity.stage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Beklenen Kapanış:</span>
                      <span className="font-medium">{new Date(selectedOpportunity.expectedClose).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>

                {/* Activity & Next Steps */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Aktivite & Sonraki Adımlar</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Son Aktivite:</div>
                      <div className="text-sm text-gray-900">{new Date(selectedOpportunity.lastActivity).toLocaleDateString('tr-TR')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Sonraki Adım:</div>
                      <div className="text-sm text-gray-900">{selectedOpportunity.nextAction}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Rakipler:</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedOpportunity.competitors.map((competitor, index) => (
                          <span key={index} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            {competitor}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Açıklama</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{selectedOpportunity.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Düzenle
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Aktivite Ekle
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  Teklif Gönder
                </button>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
