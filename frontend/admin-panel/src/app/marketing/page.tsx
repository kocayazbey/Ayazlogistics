'use client';

import React from 'react';
import Link from 'next/link';
import { Megaphone, Tag, Mail, Search, TrendingUp } from 'lucide-react';

export default function MarketingPage() {
  const stats = [
    { label: 'Aktif Kampanya', value: '12', change: '+3' },
    { label: 'Toplam Abone', value: '1,245', change: '+45' },
    { label: 'Dönüşüm Oranı', value: '3.2%', change: '+0.5%' },
    { label: 'SEO Skoru', value: '92', change: '+5' },
  ];

  const modules = [
    { name: 'Kampanyalar', icon: Megaphone, href: '/marketing/campaigns', description: 'Kampanya yönetimi ve izleme', status: 'Aktif' },
    { name: 'İndirimler', icon: Tag, href: '/marketing/discounts', description: 'İndirim kodu ve kupon yönetimi', status: 'Aktif' },
    { name: 'Newsletter', icon: Mail, href: '/marketing/newsletter', description: 'E-bülten gönderimi ve abone yönetimi', status: 'Aktif' },
    { name: 'SEO', icon: Search, href: '/marketing/seo', description: 'SEO optimizasyonu ve meta tag yönetimi', status: 'Aktif' },
    { name: 'Reklam Yönetimi', icon: TrendingUp, href: '/marketing/ads', description: 'Dijital reklam kampanyaları', status: 'Aktif' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Marketing</h1>
        <p className="text-gray-600">Kampanya yönetimi, pazarlama ve dijital stratejilerinizi yönetin</p>
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

      {/* Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link key={module.name} href={module.href}>
            <div className="bg-white rounded-xl p-6 shadow hover:shadow-lg transition-shadow border border-gray-100 hover:border-blue-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <module.icon className="w-6 h-6 text-blue-600" />
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  {module.status}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{module.name}</h3>
              <p className="text-gray-600 text-sm">{module.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
