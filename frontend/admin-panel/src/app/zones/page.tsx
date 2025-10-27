'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal, Tabs } from '@ayazlogistics/design-system';

export default function ZonesPage() {
  const [showBulkCreate, setShowBulkCreate] = useState(false);

  const zones = [
    { code: 'A', name: 'Zone A - High Velocity', type: 'pick', locations: 1200, utilization: 85, velocityClass: 'A' },
    { code: 'B', name: 'Zone B - Medium Velocity', type: 'pick', locations: 2400, utilization: 72, velocityClass: 'B' },
    { code: 'C', name: 'Zone C - Low Velocity', type: 'storage', locations: 3600, utilization: 58, velocityClass: 'C' },
    { code: 'R', name: 'Zone R - Reserve', type: 'reserve', locations: 1800, utilization: 45, velocityClass: 'D' },
  ];

  const tabs = [
    {
      key: 'zones',
      label: 'Bölgeler',
      icon: <span>📍</span>,
      content: (
        <div className="space-y-4">
          {zones.map(zone => (
            <div key={zone.code} className="bg-white rounded-xl mb-2 p-4 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-blue-600">{zone.code}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{zone.name}</p>
                    <p className="text-sm text-gray-600">{zone.locations} locations • {zone.utilization}% utilized</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={zone.velocityClass === 'A' ? 'error' : zone.velocityClass === 'B' ? 'warning' : 'default'}>
                    Class {zone.velocityClass}
                  </Badge>
                  <Button size="sm" variant="ghost">⚙️</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'routes',
      label: 'Toplama Rotaları',
      icon: <span>🗺️</span>,
      content: <div className="text-center py-12 text-gray-500">Picking routes configuration</div>,
    },
    {
      key: 'strategies',
      label: 'Yerleştirme Stratejileri',
      icon: <span>🎯</span>,
      content: <div className="text-center py-12 text-gray-500">Putaway strategies management</div>,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bölge Yönetimi</h1>
            <p className="mt-2 text-gray-600">Gelişmiş lokasyon ve bölge yapılandırması</p>
          </div>
          <Button variant="primary" onClick={() => setShowBulkCreate(true)}>
            ➕ Toplu Lokasyon Oluştur
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card hoverable>
            <p className="text-sm text-gray-500">Toplam Bölgeler</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{zones.length}</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Toplam Lokasyonlar</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">9,000</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Ort. Kullanım Oranı</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">%65</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Toplama Rotaları</p>
            <p className="mt-2 text-3xl font-bold text-green-600">12</p>
          </Card>
        </div>

        <Card>
          <Tabs tabs={tabs} />
        </Card>

        <Modal isOpen={showBulkCreate} onClose={() => setShowBulkCreate(false)} title="Toplu Lokasyon Oluştur">
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Zone" placeholder="A" required fullWidth />
              <Input label="End Zone" placeholder="D" required fullWidth />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Aisles per Zone" type="number" placeholder="10" required fullWidth />
              <Input label="Racks per Aisle" type="number" placeholder="20" required fullWidth />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Levels per Rack" type="number" placeholder="5" required fullWidth />
              <Input label="Positions per Level" type="number" placeholder="2" required fullWidth />
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-900">Will create: <strong>8,000 locations</strong></p>
              <p className="text-xs text-blue-700 mt-1">4 zones × 10 aisles × 20 racks × 5 levels × 2 positions</p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" fullWidth onClick={() => setShowBulkCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                Create Locations
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

