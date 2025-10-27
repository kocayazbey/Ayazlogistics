'use client';

import React from 'react';

export default function EcommercePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 p-6">
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text mb-4">
          📦 E-ticaret Entegrasyonları
        </h1>
        <p className="text-pink-200 mb-6">
          E-ticaret platformlarınızla entegrasyonlarınızı yönetin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-pink-500/50 transition-all">
            <div className="text-4xl mb-4">🛍️</div>
            <h3 className="text-xl font-bold text-white mb-2">Trendyol</h3>
            <p className="text-lg font-bold text-green-400">✅ Aktif</p>
            <p className="text-sm text-gray-400 mt-2">1,234 sipariş/ay</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-orange-500/50 transition-all">
            <div className="text-4xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-white mb-2">Hepsiburada</h3>
            <p className="text-lg font-bold text-green-400">✅ Aktif</p>
            <p className="text-sm text-gray-400 mt-2">892 sipariş/ay</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-white mb-2">N11</h3>
            <p className="text-lg font-bold text-green-400">✅ Aktif</p>
            <p className="text-sm text-gray-400 mt-2">567 sipariş/ay</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-bold text-white mb-2">WooCommerce</h3>
            <p className="text-lg font-bold text-green-400">✅ Aktif</p>
            <p className="text-sm text-gray-400 mt-2">345 sipariş/ay</p>
          </div>
        </div>
      </div>
    </div>
  );
}

