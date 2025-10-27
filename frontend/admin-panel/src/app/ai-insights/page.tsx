'use client';

import React from 'react';
import { SparklesIcon, ChartBarIcon, ShieldCheckIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

export default function AIInsights() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI (Yapay Zeka) Öngörüleri ve Analitik</h1>
          <p className="text-gray-600">Makine öğrenimi ve tahmine dayalı analitikle desteklenir</p>
        </div>

        {/* AI Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { icon: ChartBarIcon, title: 'Müşteri Kaybı Tahmini', description: 'Risk altındaki müşterileri tespit edin', color: 'blue', accuracy: '87%' },
            { icon: ShieldCheckIcon, title: 'Dolandırıcılık Tespiti', description: 'Gerçek zamanlı işlem analizi', color: 'red', accuracy: '94%' },
            { icon: ChatBubbleLeftIcon, title: 'Duygu Analizi', description: 'Müşteri geri bildirim öngörüleri', color: 'purple', accuracy: '91%' },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className={`w-12 h-12 bg-${feature.color}-50 rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{feature.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Model Doğruluğu</span>
                  <span className={`text-sm font-bold text-${feature.color}-600`}>{feature.accuracy}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Churn Risk Customers */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="px-6 py-5 border-b">
            <h2 className="text-xl font-bold text-gray-900">Yüksek Müşteri Kaybı Riski</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { customer: 'ABC Logistics', risk: 85, factors: ['Declining usage: -35%', 'No login: 21 days'] },
                { customer: 'XYZ Transport', risk: 72, factors: ['Support tickets: +5', 'Payment delays'] },
                { customer: 'Global Cargo', risk: 68, factors: ['Usage drop: -20%', 'Price complaints'] },
              ].map((item) => (
                <div key={item.customer} className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{item.customer}</h3>
                    <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded-full">
                      {item.risk}% Risk
                    </span>
                  </div>
                  <div className="space-y-1 mb-3">
                    {item.factors.map((factor, idx) => (
                      <p key={idx} className="text-sm text-gray-700">⚠️ {factor}</p>
                    ))}
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                    Elde Tutma Planını Görüntüle
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fraud Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-6 py-5 border-b">
            <h2 className="text-xl font-bold text-gray-900">Son Dolandırıcılık Uyarıları</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlem ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Müşteri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dolandırıcılık Skoru</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { id: 'TXN-001', customer: 'Suspicious Corp', amount: '₺50,000', score: 92, status: 'blocked' },
                { id: 'TXN-002', customer: 'Unknown Ltd', amount: '₺35,000', score: 78, status: 'review' },
                { id: 'TXN-003', customer: 'Test Company', amount: '₺25,000', score: 65, status: 'cleared' },
              ].map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{alert.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{alert.customer}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{alert.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.score > 80 ? 'bg-red-100 text-red-800' :
                      alert.score > 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {alert.score}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.status === 'blocked' ? 'bg-red-100 text-red-800' :
                      alert.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

