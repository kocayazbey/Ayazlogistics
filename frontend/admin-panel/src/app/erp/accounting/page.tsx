'use client';

import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CreditCard,
  Receipt,
  Calculator,
  PieChart,
  BarChart3,
  Calendar,
  Download,
  Upload,
  Filter,
  Search
} from 'lucide-react';

export default function ERPAccountingPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedView, setSelectedView] = useState('overview');

  const financialSummary = {
    totalRevenue: 2450000,
    totalExpenses: 1800000,
    netProfit: 650000,
    profitMargin: 26.5,
    cashFlow: 320000,
    accountsReceivable: 450000,
    accountsPayable: 280000
  };

  const revenueData = [
    { month: 'Ocak', revenue: 2200000, expenses: 1600000 },
    { month: 'Şubat', revenue: 2350000, expenses: 1700000 },
    { month: 'Mart', revenue: 2450000, expenses: 1800000 },
    { month: 'Nisan', revenue: 2500000, expenses: 1850000 },
    { month: 'Mayıs', revenue: 2600000, expenses: 1900000 },
    { month: 'Haziran', revenue: 2700000, expenses: 1950000 }
  ];

  const expenseCategories = [
    { name: 'Personel Giderleri', amount: 850000, percentage: 47.2, color: 'bg-blue-500' },
    { name: 'Yakıt Giderleri', amount: 320000, percentage: 17.8, color: 'bg-green-500' },
    { name: 'Araç Bakım', amount: 180000, percentage: 10.0, color: 'bg-yellow-500' },
    { name: 'Depo Kiraları', amount: 250000, percentage: 13.9, color: 'bg-purple-500' },
    { name: 'Sigorta', amount: 120000, percentage: 6.7, color: 'bg-red-500' },
    { name: 'Diğer', amount: 80000, percentage: 4.4, color: 'bg-gray-500' }
  ];

  const recentTransactions = [
    {
      id: 'TXN001',
      date: '2024-01-27',
      description: 'Müşteri Ödemesi - ABC Şirketi',
      amount: 45000,
      type: 'income',
      category: 'Müşteri Ödemeleri',
      status: 'completed'
    },
    {
      id: 'TXN002',
      date: '2024-01-27',
      description: 'Yakıt Gideri - Shell',
      amount: -8500,
      type: 'expense',
      category: 'Yakıt',
      status: 'completed'
    },
    {
      id: 'TXN003',
      date: '2024-01-26',
      description: 'Araç Bakım - Mercedes Servis',
      amount: -12000,
      type: 'expense',
      category: 'Bakım',
      status: 'pending'
    },
    {
      id: 'TXN004',
      date: '2024-01-26',
      description: 'Müşteri Ödemesi - XYZ Ltd.',
      amount: 32000,
      type: 'income',
      category: 'Müşteri Ödemeleri',
      status: 'completed'
    }
  ];

  const kpis = [
    {
      name: 'Toplam Gelir',
      value: '₺2.45M',
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp
    },
    {
      name: 'Net Kar',
      value: '₺650K',
      change: '+8.3%',
      trend: 'up',
      icon: DollarSign
    },
    {
      name: 'Kar Marjı',
      value: '26.5%',
      change: '+2.1%',
      trend: 'up',
      icon: PieChart
    },
    {
      name: 'Nakit Akışı',
      value: '₺320K',
      change: '+15.2%',
      trend: 'up',
      icon: CreditCard
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Bekliyor';
      case 'cancelled':
        return 'İptal';
      default:
        return 'Bilinmiyor';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Muhasebe Yönetimi</h1>
          <p className="text-gray-600">Finansal durumu takip edin ve yönetin</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, index) => (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <kpi.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className={`flex items-center text-sm ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className={`w-4 h-4 mr-1 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                  {kpi.change}
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</div>
              <div className="text-sm text-gray-600">{kpi.name}</div>
            </div>
          ))}
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Gelir Trendi</h2>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-sm">6 Ay</button>
                <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm">1 Yıl</button>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Gelir grafiği</p>
                <p className="text-sm text-gray-400">Chart.js entegrasyonu</p>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Gider Dağılımı</h2>
            <div className="space-y-4">
              {expenseCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${category.color}`}></div>
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">₺{category.amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{category.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Son İşlemler</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                  <Download className="w-4 h-4 mr-2" />
                  Dışa Aktar
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  İçe Aktar
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tutar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                      <div className="text-sm text-gray-500">#{transaction.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}₺{Math.abs(transaction.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Alacaklar</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              ₺{financialSummary.accountsReceivable.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Bekleyen ödemeler</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Borçlar</h3>
            <div className="text-3xl font-bold text-red-600 mb-2">
              ₺{financialSummary.accountsPayable.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Ödenecek faturalar</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nakit Akışı</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">
              ₺{financialSummary.cashFlow.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Mevcut nakit</div>
          </div>
        </div>
      </div>
    </div>
  );
}
