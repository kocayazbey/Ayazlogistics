'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, BookOpen, Image as ImageIcon, HelpCircle } from 'lucide-react';

export default function ContentPage() {
  const stats = [
    { label: 'Toplam Sayfa', value: '45', change: '+5' },
    { label: 'Blog Yazısı', value: '128', change: '+12' },
    { label: 'Aktif Banner', value: '8', change: '+2' },
    { label: 'FAQ Sayısı', value: '32', change: '+4' },
  ];

  const modules = [
    { name: 'Sayfalar', icon: FileText, href: '/content/pages', description: 'Web sayfalarını yönetin ve düzenleyin', status: 'Aktif' },
    { name: 'Bloglar', icon: BookOpen, href: '/content/blogs', description: 'Blog yazıları ve içerik yönetimi', status: 'Aktif' },
    { name: 'Bannerlar', icon: ImageIcon, href: '/content/banners', description: 'Görsel ve banner yönetimi', status: 'Aktif' },
    { name: 'SSS / FAQ', icon: HelpCircle, href: '/content/faq', description: 'Sık sorulan sorular ve cevaplar', status: 'Aktif' },
  ];

  const recentContent = [
    { type: 'Sayfa', title: 'Ana Sayfa', author: 'Admin', updated: '2 saat önce', status: 'Yayında' },
    { type: 'Blog', title: 'Lojistik Sektöründeki Yeni Trendler', author: 'Admin', updated: '1 gün önce', status: 'Yayında' },
    { type: 'Banner', title: 'Kış Kampanyası', author: 'Admin', updated: '3 gün önce', status: 'Aktif' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">İçerik Yönetimi</h1>
        <p className="text-gray-600">Web içeriklerinizi, bloglarınızı ve dijital materyallerinizi yönetin</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        {/* Recent Content */}
        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Son İçerikler</h3>
          <div className="space-y-4">
            {recentContent.map((content, idx) => (
              <div key={idx} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {content.type}
                  </span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                    {content.status}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{content.title}</h4>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{content.author}</span>
                  <span className="mx-2">•</span>
                  <span>{content.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
