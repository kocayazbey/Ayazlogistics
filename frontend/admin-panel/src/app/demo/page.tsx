'use client';

import React from 'react';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Demo Video</h1>
          <p className="text-lg text-gray-600">AyazLogistics sisteminin özelliklerini keşfedin</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center mb-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <p className="text-gray-600">Demo video burada görüntülenecek</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-blue-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WMS Demo</h3>
              <p className="text-gray-600 mb-4">Depo yönetim sistemi özellikleri</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                İzle
              </button>
            </div>
            
            <div className="p-6 bg-green-50 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">TMS Demo</h3>
              <p className="text-gray-600 mb-4">Taşıma yönetim sistemi özellikleri</p>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                İzle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
