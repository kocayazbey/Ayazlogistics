'use client';

import React from 'react';

export default function RoutesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text mb-4">
          🛣️ Rota Yönetimi
        </h1>
        <p className="text-blue-200 mb-6">
          Teslimat rotalarını planlayın ve optimize edin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="text-4xl mb-4">🚛</div>
            <h3 className="text-xl font-bold text-white mb-2">Aktif Rotalar</h3>
            <p className="text-3xl font-bold text-blue-400">24</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">Tamamlanan</h3>
            <p className="text-3xl font-bold text-green-400">156</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">Toplam Mesafe</h3>
            <p className="text-3xl font-bold text-purple-400">12,456 km</p>
          </div>
        </div>
      </div>
    </div>
  );
}

