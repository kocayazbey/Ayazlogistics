'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, FileText, CreditCard, TrendingUp, Plus, Eye } from 'lucide-react';

export default function BillingPage() {
  const stats = [
    { label: 'Bu Ay Gelir', value: '₺2.4M', change: '+12%' },
    { label: 'Bekleyen Fatura', value: '₺456K', change: '+8%' },
    { label: 'Toplam Müşteri', value: '234', change: '+5' },
    { label: 'Ortalama Fatura', value: '₺10.2K', change: '+3%' },
  ];

  const recentInvoices = [
    { id: 'INV-2025-001', customer: 'ABC Tekstil', amount: '₺45,600', status: 'Ödendi', date: '2025-01-15' },
    { id: 'INV-2025-002', customer: 'XYZ Gıda', amount: '₺23,400', status: 'Beklemede', date: '2025-01-14' },
    { id: 'INV-2025-003', customer: 'DEF Otomotiv', amount: '₺67,800', status: 'Ödendi', date: '2025-01-13' },
    { id: 'INV-2025-004', customer: 'GHI Teknoloji', amount: '₺12,300', status: 'Gecikmiş', date: '2025-01-10' },
  ];

  const quickActions = [
    { title: 'Yeni Fatura', icon: Plus, href: '/billing/invoices', color: 'from-blue-600 to-cyan-500' },
    { title: 'Fatura Listesi', icon: FileText, href: '/billing/invoices', color: 'from-green-600 to-emerald-500' },
    { title: 'Ödemeler', icon: CreditCard, href: '/payments', color: 'from-purple-600 to-pink-500' },
    { title: 'Raporlar', icon: TrendingUp, href: '/billing/reports', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Faturalama Sistemi</h1>
        <p className="text-gray-600">Faturalarınızı yönetin ve gelirlerinizi takip edin</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-purple-500 to-pink-500',
            'from-orange-500 to-red-500'
          ];
          
          return (
            <div 
              key={stat.label} 
              className={`bg-gradient-to-br ${gradients[idx]} rounded-2xl p-6 text-white shadow-lg`}
            >
              <p className="text-sm opacity-90 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
              <p className="text-sm opacity-90">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">Hızlı erişim</p>
                </div>
                <action.icon className="h-8 w-8" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Invoices & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Son Faturalar</h3>
          <div className="space-y-4">
            {recentInvoices.map((invoice, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    invoice.status === 'Ödendi' ? 'bg-green-500' :
                    invoice.status === 'Beklemede' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invoice.id}</p>
                    <p className="text-xs text-gray-500">{invoice.customer}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{invoice.amount}</p>
                  <p className="text-xs text-gray-500">{invoice.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Gelir Analizi</h3>
          <div className="space-y-4">
            {[
              { label: 'Bu Ay Gelir', value: '₺2.4M', progress: 85, color: 'bg-blue-500' },
              { label: 'Geçen Ay Gelir', value: '₺2.1M', progress: 78, color: 'bg-green-500' },
              { label: 'Bekleyen Ödemeler', value: '₺456K', progress: 45, color: 'bg-yellow-500' },
              { label: 'Gecikmiş Ödemeler', value: '₺123K', progress: 15, color: 'bg-red-500' },
            ].map((metric, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                  <span className="text-sm font-bold text-gray-900">{metric.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${metric.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}