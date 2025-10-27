'use client';

import React from 'react';

export default function APIManagementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="glass border border-white/10 rounded-2xl p-6 shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text mb-4">
          🌐 API Yönetimi
        </h1>
        <p className="text-indigo-200 mb-6">
          API anahtarlarınızı yönetin ve kullanım istatistiklerini görüntüleyin.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-indigo-500/50 transition-all">
            <div className="text-4xl mb-4">🔑</div>
            <h3 className="text-xl font-bold text-white mb-2">API Keys</h3>
            <p className="text-3xl font-bold text-indigo-400">12</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all">
            <div className="text-4xl mb-4">📡</div>
            <h3 className="text-xl font-bold text-white mb-2">API Çağrıları (Bugün)</h3>
            <p className="text-3xl font-bold text-blue-400">45.2K</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-green-500/50 transition-all">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-white mb-2">Başarı Oranı</h3>
            <p className="text-3xl font-bold text-green-400">99.7%</p>
          </div>
          <div className="glass border border-white/10 rounded-xl p-6 hover:border-orange-500/50 transition-all">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">Ort. Yanıt Süresi</h3>
            <p className="text-3xl font-bold text-orange-400">125ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}

