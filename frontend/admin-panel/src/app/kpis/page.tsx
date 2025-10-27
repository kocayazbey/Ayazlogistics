'use client';

import React from 'react';

export default function KPIsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text mb-4">
          📊 Anahtar Performans Göstergeleri
        </h1>
        <p className="text-blue-200 mb-6">
          İş performansınızı ölçün ve hedeflerinizi takip edin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">Teslimat Başarı Oranı</h3>
            <p className="text-4xl font-bold text-green-400">98.5%</p>
            <p className="text-sm text-green-300 mt-2">↑ 2.3% geçen aya göre</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Stok Devir Hızı</h3>
            <p className="text-4xl font-bold text-blue-400">12.4x</p>
            <p className="text-sm text-blue-300 mt-2">↑ 1.8x geçen aya göre</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div className="text-4xl mb-4">😊</div>
            <h3 className="text-xl font-bold text-white mb-2">Müşteri Memnuniyeti</h3>
            <p className="text-4xl font-bold text-purple-400">4.8/5</p>
            <p className="text-sm text-purple-300 mt-2">↑ 0.3 geçen aya göre</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-orange-500/50 transition-all">
            <div className="text-4xl mb-4">🚛</div>
            <h3 className="text-xl font-bold text-white mb-2">Filo Kullanım Oranı</h3>
            <p className="text-4xl font-bold text-orange-400">89%</p>
            <p className="text-sm text-orange-300 mt-2">↑ 5% geçen aya göre</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-cyan-500/50 transition-all">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-white mb-2">Depo Doluluk Oranı</h3>
            <p className="text-4xl font-bold text-cyan-400">76%</p>
            <p className="text-sm text-cyan-300 mt-2">↑ 8% geçen aya göre</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-pink-500/50 transition-all">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-white mb-2">Kar Marjı</h3>
            <p className="text-4xl font-bold text-pink-400">23.5%</p>
            <p className="text-sm text-pink-300 mt-2">↑ 1.2% geçen aya göre</p>
          </div>
        </div>
      </div>
    </div>
  );
}

