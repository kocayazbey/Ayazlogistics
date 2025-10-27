'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar,
  Filter,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Eye,
  Printer
} from 'lucide-react';

export default function ReportsFinancialPage() {
  const [selectedReport, setSelectedReport] = useState('revenue');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-01-31'
  });

  const reportTypes = [
    {
      id: 'revenue',
      name: 'Gelir Raporu',
      description: 'Aylık ve yıllık gelir analizi',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'expense',
      name: 'Gider Raporu',
      description: 'Kategori bazında gider analizi',
      icon: TrendingDown,
      color: 'bg-red-100 text-red-600'
    },
    {
      id: 'profit',
      name: 'Kar-Zarar Raporu',
      description: 'Net kar analizi ve trend',
      icon: DollarSign,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'cashflow',
      name: 'Nakit Akış Raporu',
      description: 'Giriş ve çıkış analizi',
      icon: PieChart,
      color: 'bg-purple-100 text-purple-600'
    }
  ];

  const financialData = {
    revenue: {
      total: 2450000,
      change: '+12.5%',
      breakdown: [
        { category: 'Lojistik Hizmetleri', amount: 1800000, percentage: 73.5 },
        { category: 'Depo Kiralama', amount: 450000, percentage: 18.4 },
        { category: 'Danışmanlık', amount: 200000, percentage: 8.1 }
      ]
    },
    expenses: {
      total: 1800000,
      change: '+8.2%',
      breakdown: [
        { category: 'Personel Giderleri', amount: 850000, percentage: 47.2 },
        { category: 'Yakıt Giderleri', amount: 320000, percentage: 17.8 },
        { category: 'Araç Bakım', amount: 180000, percentage: 10.0 },
        { category: 'Depo Kiraları', amount: 250000, percentage: 13.9 },
        { category: 'Sigorta', amount: 120000, percentage: 6.7 },
        { category: 'Diğer', amount: 80000, percentage: 4.4 }
      ]
    },
    profit: {
      gross: 650000,
      net: 520000,
      margin: 26.5
    }
  };

  const recentReports = [
    {
      id: 'RPT001',
      name: 'Ocak 2024 Gelir Raporu',
      type: 'Gelir',
      date: '2024-01-31',
      status: 'completed',
      size: '2.4 MB'
    },
    {
      id: 'RPT002',
      name: 'Aralık 2023 Kar-Zarar',
      type: 'Kar-Zarar',
      date: '2023-12-31',
      status: 'completed',
      size: '1.8 MB'
    },
    {
      id: 'RPT003',
      name: 'Q4 2023 Nakit Akış',
      type: 'Nakit Akış',
      date: '2024-01-15',
      status: 'completed',
      size: '3.2 MB'
    },
    {
      id: 'RPT004',
      name: 'Şubat 2024 Gider Raporu',
      type: 'Gider',
      date: '2024-02-28',
      status: 'generating',
      size: '-'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'generating':
        return 'Oluşturuluyor';
      case 'failed':
        return 'Başarısız';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finansal Raporlar</h1>
          <p className="text-gray-600">Mali durumu analiz edin ve raporlayın</p>
        </div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {reportTypes.map((report) => (
            <div 
              key={report.id}
              className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all ${
                selectedReport === report.id ? 'border-blue-500' : 'border-gray-100'
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-xl ${report.color}`}>
                  <report.icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{report.name}</h3>
              <p className="text-sm text-gray-600">{report.description}</p>
            </div>
          ))}
        </div>

        {/* Report Configuration */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Rapor Ayarları</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dönem</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="current-month">Bu Ay</option>
                <option value="last-month">Geçen Ay</option>
                <option value="current-quarter">Bu Çeyrek</option>
                <option value="last-quarter">Geçen Çeyrek</option>
                <option value="current-year">Bu Yıl</option>
                <option value="last-year">Geçen Yıl</option>
                <option value="custom">Özel Tarih</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Rapor Oluştur
            </button>
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Excel İndir
            </button>
            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Grafik Görünümü
            </button>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Gelir Özeti</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              ₺{financialData.revenue.total.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-green-600 mb-4">
              <TrendingUp className="w-4 h-4 mr-1" />
              {financialData.revenue.change}
            </div>
            <div className="space-y-2">
              {financialData.revenue.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.category}</span>
                  <span className="font-medium">₺{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Gider Özeti</h3>
            <div className="text-3xl font-bold text-red-600 mb-2">
              ₺{financialData.expenses.total.toLocaleString()}
            </div>
            <div className="flex items-center text-sm text-red-600 mb-4">
              <TrendingDown className="w-4 h-4 mr-1" />
              {financialData.expenses.change}
            </div>
            <div className="space-y-2">
              {financialData.expenses.breakdown.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.category}</span>
                  <span className="font-medium">₺{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Kar Özeti</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ₺{financialData.profit.net.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Kar Marjı: %{financialData.profit.margin}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Brüt Kar</span>
                <span className="font-medium">₺{financialData.profit.gross.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Net Kar</span>
                <span className="font-medium">₺{financialData.profit.net.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Son Raporlar</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rapor Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Boyut
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
                {recentReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.name}</div>
                        <div className="text-sm text-gray-500">#{report.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusText(report.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Finansal Trend Analizi</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Finansal grafik</p>
              <p className="text-sm text-gray-400">Chart.js entegrasyonu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
