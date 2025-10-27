'use client';

import React, { useState } from 'react';
import { 
  QuestionMarkCircleIcon, 
  BookOpenIcon, 
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'getting-started', name: 'Başlangıç', icon: '🚀' },
    { id: 'wms', name: 'WMS (Depo Yönetimi)', icon: '📦' },
    { id: 'tms', name: 'TMS (Taşıma Yönetimi)', icon: '🚚' },
    { id: 'billing', name: 'Faturalama', icon: '💰' },
    { id: 'reports', name: 'Raporlar', icon: '📊' },
    { id: 'settings', name: 'Ayarlar', icon: '⚙️' },
  ];

  const faqs = [
    {
      id: 1,
      category: 'getting-started',
      question: 'Sisteme nasıl giriş yapabilirim?',
      answer: 'Ana sayfadaki "Giriş Yap" butonuna tıklayarak email ve şifrenizle giriş yapabilirsiniz. Demo giriş için "Demo Giriş" butonunu kullanabilirsiniz.',
      popular: true
    },
    {
      id: 2,
      category: 'wms',
      question: 'Yeni depo nasıl eklenir?',
      answer: 'WMS > Depo Yönetimi > Yeni Depo Ekle butonuna tıklayarak depo bilgilerini doldurun ve kaydedin.',
      popular: true
    },
    {
      id: 3,
      category: 'wms',
      question: 'Envanter nasıl yönetilir?',
      answer: 'WMS > Envanter Yönetimi sayfasından ürün ekleyebilir, stok durumunu kontrol edebilir ve FIFO/FEFO takibi yapabilirsiniz.',
      popular: false
    },
    {
      id: 4,
      category: 'tms',
      question: 'Araç nasıl eklenir?',
      answer: 'TMS > Araç Yönetimi > Yeni Araç Ekle butonuna tıklayarak araç bilgilerini girin.',
      popular: true
    },
    {
      id: 5,
      category: 'tms',
      question: 'Gönderi nasıl takip edilir?',
      answer: 'TMS > Takip sayfasından gönderi numarası ile arama yapabilir veya aktif gönderileri görüntüleyebilirsiniz.',
      popular: false
    },
    {
      id: 6,
      category: 'billing',
      question: 'Fatura nasıl oluşturulur?',
      answer: 'Faturalama > Yeni Fatura butonuna tıklayarak müşteri seçin, hizmet detaylarını girin ve faturayı oluşturun.',
      popular: true
    },
    {
      id: 7,
      category: 'reports',
      question: 'Rapor nasıl oluşturulur?',
      answer: 'Raporlar sayfasından istediğiniz rapor tipini seçin, tarih aralığını belirleyin ve "Rapor Oluştur" butonuna tıklayın.',
      popular: false
    },
    {
      id: 8,
      category: 'settings',
      question: 'Kullanıcı nasıl eklenir?',
      answer: 'Ayarlar > Kullanıcılar ve Roller > Yeni Kullanıcı Ekle butonuna tıklayarak kullanıcı bilgilerini girin.',
      popular: true
    }
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const popularFaqs = faqs.filter(faq => faq.popular);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Yardım Merkezi</h1>
          <p className="text-xl text-gray-600">Sorularınızın cevaplarını burada bulabilirsiniz</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Sorunuzu arayın..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center hover:shadow-lg transition-shadow">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Canlı Destek</h3>
            <p className="text-gray-600 mb-4">7/24 canlı destek hattımızdan yardım alın</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Destek Başlat
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center hover:shadow-lg transition-shadow">
            <PhoneIcon className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Telefon Desteği</h3>
            <p className="text-gray-600 mb-4">+90 212 555 0123 numarasından bize ulaşın</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Ara
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border p-6 text-center hover:shadow-lg transition-shadow">
            <EnvelopeIcon className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">E-posta Desteği</h3>
            <p className="text-gray-600 mb-4">destek@ayazlogistics.com adresine yazın</p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              E-posta Gönder
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Kategoriler</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedCategory === category.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="text-sm font-medium">{category.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Popular FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sık Sorulan Sorular</h2>
          <div className="space-y-4">
            {popularFaqs.map((faq) => (
              <div key={faq.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* All FAQs */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Tüm Sorular</h2>
          <div className="space-y-4">
            {filteredFaqs.map((faq) => (
              <div key={faq.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

