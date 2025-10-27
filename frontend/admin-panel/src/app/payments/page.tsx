'use client';

import React from 'react';

export default function PaymentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-6">
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text mb-4">
          💳 Ödeme Yönetimi
        </h1>
        <p className="text-green-200 mb-6">
          Tahsilat ve ödemeleri takip edin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-bold text-white mb-2">Toplam Tahsilat</h3>
            <p className="text-3xl font-bold text-green-400">₺2.4M</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-orange-500/50 transition-all">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-xl font-bold text-white mb-2">Bekleyen</h3>
            <p className="text-3xl font-bold text-orange-400">₺456K</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-red-500/50 transition-all">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Gecikmiş</h3>
            <p className="text-3xl font-bold text-red-400">₺78K</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Ort. Süre</h3>
            <p className="text-3xl font-bold text-blue-400">24 gün</p>
          </div>
        </div>
      </div>
    </div>
  );
}

