import React from 'react';
import { Badge } from '@ayazlogistics/design-system';

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="search"
            placeholder="Ara..."
            className="w-96 px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-center gap-6">
          <button className="relative">
            <span className="text-2xl">🔔</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
              3
            </span>
          </button>
          
          <button className="relative">
            <span className="text-2xl">💬</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
              5
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              AY
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Yönetici</p>
              <p className="text-xs text-gray-500">Süper Yönetici</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

