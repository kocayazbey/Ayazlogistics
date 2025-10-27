'use client';

import React from 'react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">AyazLogistics</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                Giriş Yap
              </Link>
              <Link 
                href="/register" 
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Kayıt Ol
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Modern Lojistik Yönetim Sistemi
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Depo yönetimi, taşıma operasyonları ve müşteri ilişkileri için kapsamlı çözümler
          </p>
          <div className="flex justify-center space-x-4">
            <Link 
              href="/login" 
              className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Sisteme Giriş
            </Link>
            <Link 
              href="/demo" 
              className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
            >
              Demo İzle
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Özellikler</h2>
            <p className="text-lg text-gray-600">Lojistik operasyonlarınızı optimize edin</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '📦',
                title: 'Depo Yönetimi (WMS)',
                description: 'Gelişmiş depo operasyonları, stok takibi ve envanter yönetimi'
              },
              {
                icon: '🚛',
                title: 'Taşıma Yönetimi (TMS)',
                description: 'Rota optimizasyonu, filo yönetimi ve teslimat takibi'
              },
              {
                icon: '📊',
                title: 'Analitik ve Raporlama',
                description: 'Gerçek zamanlı veriler ve performans analizi'
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-2xl hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <span className="ml-3 text-2xl font-bold">AyazLogistics</span>
            </div>
            <p className="text-gray-400">© 2025 AyazLogistics. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
