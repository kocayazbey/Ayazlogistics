'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@ayazlogistics/design-system';

export default function MonitoringPage() {
  const [dashboard, setDashboard] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fetch dashboard data
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gerçek Zamanlı İzleme</h1>
          <p className="mt-2 text-gray-600">Canlı depo operasyonları gösterge paneli</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card title="Aktif PTE (Toplama Ekipmanı) Görevleri">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">PICK-{1000 + i}</p>
                    <p className="text-sm text-gray-600">Bölge A • %75 tamamlandı</p>
                  </div>
                  <Badge variant="success" dot>Aktif</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Toplama Arabaları">
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Araba-{i}</p>
                    <p className="text-sm text-gray-600">{12 + i}/20 ürün</p>
                  </div>
                  <Badge variant="warning">İşlemde</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Sevkiyat Rampaları">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">Dock {i}</p>
                  <Badge variant={i === 1 ? 'success' : 'default'}>{i === 1 ? 'Yükleniyor' : 'Müsait'}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Bölge Kullanımı">
            <div className="space-y-4">
              {['A', 'B', 'C'].map(zone => (
                <div key={zone}>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Bölge {zone}</span>
                    <span className="text-sm text-gray-600">{zone === 'A' ? 78 : zone === 'B' ? 65 : 52}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${zone === 'A' ? 78 : zone === 'B' ? 65 : 52}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="İkmal İhtiyaçları">
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="font-medium">A-01-L02-P0{i}</p>
                    <p className="text-sm text-gray-600">SKU-{1000 + i} • Düşük stok</p>
                  </div>
                  <Badge variant="error">Kritik</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

