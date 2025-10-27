'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Table } from '@ayazlogistics/design-system';

export default function ITSPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const serialNumbers = [
    { itsCode: 'ITS-1730000001-1', gtin: '01234567890128', batch: 'LOT-2025-001', status: 'ACTIVE', createdAt: '2025-10-20', product: 'Product A' },
    { itsCode: 'ITS-1730000001-2', gtin: '01234567890128', batch: 'LOT-2025-001', status: 'ACTIVE', createdAt: '2025-10-20', product: 'Product A' },
    { itsCode: 'ITS-1730000002-1', gtin: '01234567890135', batch: 'LOT-2025-002', status: 'DEACTIVATED', createdAt: '2025-10-18', product: 'Product B' },
  ];

  const aggregations = [
    { id: 'AGG-001', parentCode: 'CARTON-12345', type: 'CARTON', childCount: 24, status: 'ACTIVE', createdAt: '2025-10-24' },
    { id: 'AGG-002', parentCode: 'PALLET-67890', type: 'PALLET', childCount: 120, status: 'ACTIVE', createdAt: '2025-10-24' },
  ];

  const serialColumns = [
    { 
      key: 'itsCode',
      label: 'ITS Code',
      render: (value: string, row: any) => (
        <div>
          <code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">{value}</code>
          <p className="text-xs text-gray-500 mt-1">{row.product}</p>
        </div>
      ),
    },
    { 
      key: 'gtin',
      label: 'GTIN',
      render: (value: string) => (
        <code className="text-xs font-mono">{value}</code>
      ),
    },
    { key: 'batch', label: 'Batch/Lot' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'ACTIVE' ? 'success' : 'default'} dot>
          {value}
        </Badge>
      ),
    },
    { key: 'createdAt', label: 'Created' },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary">🔍 Track</Button>
          <Button size="sm" variant="ghost">📋 History</Button>
        </div>
      ),
    },
  ];

  const aggregationColumns = [
    { 
      key: 'parentCode',
      label: 'Parent Code',
      render: (value: string, row: any) => (
        <div>
          <code className="text-sm font-mono font-semibold">{value}</code>
          <p className="text-xs text-gray-500 mt-1">{row.type}</p>
        </div>
      ),
    },
    { 
      key: 'childCount',
      label: 'Child Items',
      render: (value: number) => (
        <Badge variant="default">{value} items</Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'ACTIVE' ? 'success' : 'default'}>
          {value}
        </Badge>
      ),
    },
    { key: 'createdAt', label: 'Created' },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary">👁️ View</Button>
          <Button size="sm" variant="error">❌ Deaggregate</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ITS (Akıllı Takip Sistemi) Entegrasyonu</h1>
            <p className="mt-2 text-gray-600">Seri numarası yönetimi ve ürün izlenebilirliği</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">🔄 ITS ile Senkronize Et</Button>
            <Button variant="primary">➕ Seri Numarası Oluştur</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <p className="text-sm text-gray-500">Toplam Seri Numaraları</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">12,456</p>
            <p className="mt-1 text-sm text-green-600">+245 bugün</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Aktif</p>
            <p className="mt-2 text-3xl font-bold text-green-600">11,234</p>
            <p className="mt-1 text-sm text-gray-600">%90.2</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Toplamalar</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">1,456</p>
            <p className="mt-1 text-sm text-gray-600">Koli ve Paletler</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">QC (Kalite Kontrol) Geçti</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">%98.5</p>
            <p className="mt-1 text-sm text-green-600">Hedef: %98</p>
          </Card>
        </div>

        <Card className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Seri Numaraları</h3>
          <div className="mb-4">
            <Input
              placeholder="ITS kodu, GTIN, lot veya ürüne göre ara..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              fullWidth
              icon={<span>🔍</span>}
            />
          </div>
          <Table columns={serialColumns} data={serialNumbers} />
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Toplamalar (Koli ve Paletler)</h3>
          <Table columns={aggregationColumns} data={aggregations} />
        </Card>

        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Takip Olayları</h3>
          <div className="space-y-3">
            {[
              { event: 'PRODUCTION', itsCode: 'ITS-1730000001-1', location: 'PROD-LINE-01', time: '10 min ago', user: 'System' },
              { event: 'RECEIVING', itsCode: 'ITS-1730000001-2', location: 'RCV-DOCK-01', time: '25 min ago', user: 'Ahmet Y.' },
              { event: 'QC_PASS', itsCode: 'ITS-1730000001-1', location: 'QC-AREA', time: '1 hour ago', user: 'QC Inspector' },
              { event: 'AGGREGATION', itsCode: 'CARTON-12345', location: 'PACK-AREA', time: '2 hours ago', user: 'Packer-03' },
            ].map((event, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-4">
                  <Badge variant={
                    event.event === 'QC_PASS' ? 'success' :
                    event.event === 'AGGREGATION' ? 'default' :
                    'secondary'
                  }>
                    {event.event}
                  </Badge>
                  <div>
                    <code className="text-sm font-mono text-blue-600">{event.itsCode}</code>
                    <p className="text-xs text-gray-500 mt-1">
                      Location: <span className="font-medium">{event.location}</span> • User: {event.user}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{event.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

