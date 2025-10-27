'use client';

import React from 'react';

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-4">
          🎯 Pazarlama Kampanyaları
        </h1>
        <p className="text-purple-200 mb-6">
          Marketing kampanyalarınızı planlayın ve sonuçlarını takip edin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-white mb-2">Aktif</h3>
            <p className="text-3xl font-bold text-purple-400">8</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white mb-2">Planlanmış</h3>
            <p className="text-3xl font-bold text-blue-400">5</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">Tamamlanan</h3>
            <p className="text-3xl font-bold text-green-400">23</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-orange-500/50 transition-all">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-white mb-2">ROI</h3>
            <p className="text-3xl font-bold text-orange-400">245%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

