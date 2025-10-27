'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal, Table, Tabs } from '@ayazlogistics/design-system';

export default function DriversPage() {
  const [activeTab, setActiveTab] = useState('drivers');
  const [showModal, setShowModal] = useState(false);

  const drivers = [
    { id: '1', name: 'Mehmet Yılmaz', license: 'B-12345678', phone: '+90 555 123 4567', carrier: 'Aras Kargo', status: 'available', rating: 4.8, trips: 156 },
    { id: '2', name: 'Ahmet Demir', license: 'B-23456789', phone: '+90 555 234 5678', carrier: 'MNG Kargo', status: 'on_duty', rating: 4.6, trips: 142 },
    { id: '3', name: 'Ali Kaya', license: 'C-34567890', phone: '+90 555 345 6789', carrier: 'Yurtiçi Kargo', status: 'on_break', rating: 4.9, trips: 189 },
  ];

  const carriers = [
    { id: '1', code: 'ARAS', name: 'Aras Kargo', type: 'PARCEL', vehicles: 12, drivers: 18, rating: 4.7, onTime: '96.5%' },
    { id: '2', code: 'MNG', name: 'MNG Kargo', type: 'COURIER', vehicles: 8, drivers: 12, rating: 4.5, onTime: '94.2%' },
    { id: '3', code: 'YURTICI', name: 'Yurtiçi Kargo', type: 'PARCEL', vehicles: 15, drivers: 22, rating: 4.8, onTime: '97.1%' },
  ];

  const vehicleTypes = [
    { id: '1', code: 'TRUCK-MEDIUM', name: 'Medium Truck', nameTr: 'Orta Boy Kamyon', maxWeight: '5,000 kg', maxVolume: '30 m³', count: 12 },
    { id: '2', code: 'VAN-STANDARD', name: 'Standard Van', nameTr: 'Standart Minibüs', maxWeight: '3,500 kg', maxVolume: '15 m³', count: 8 },
    { id: '3', code: 'TRUCK-REFRIGERATED', name: 'Refrigerated Truck', nameTr: 'Soğutuculu Kamyon', maxWeight: '10,000 kg', maxVolume: '40 m³', count: 5 },
  ];

  const driverColumns = [
    { 
      key: 'name',
      label: 'Driver Name',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">License: {row.license}</p>
        </div>
      ),
    },
    { key: 'phone', label: 'Phone' },
    { 
      key: 'carrier',
      label: 'Carrier',
      render: (value: string) => <Badge variant="default">{value}</Badge>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={
          value === 'available' ? 'success' :
          value === 'on_duty' ? 'default' :
          'warning'
        } dot>
          {value.replace('_', ' ').toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">⭐</span>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    { key: 'trips', label: 'Trips' },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary">✏️</Button>
          <Button size="sm" variant="ghost">👁️</Button>
          <Button size="sm" variant="ghost">📋</Button>
        </div>
      ),
    },
  ];

  const carrierColumns = [
    {
      key: 'name',
      label: 'Carrier',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <code className="text-xs text-blue-600">{row.code}</code>
        </div>
      ),
    },
    { 
      key: 'type',
      label: 'Type',
      render: (value: string) => <Badge>{value}</Badge>,
    },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'drivers', label: 'Drivers' },
    {
      key: 'rating',
      label: 'Rating',
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">⭐</span>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    { 
      key: 'onTime',
      label: 'On-Time %',
      render: (value: string) => (
        <span className="font-medium text-green-600">{value}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary">✏️</Button>
          <Button size="sm" variant="ghost">📊</Button>
        </div>
      ),
    },
  ];

  const vehicleTypeColumns = [
    {
      key: 'name',
      label: 'Vehicle Type',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{row.nameTr}</p>
          <code className="text-xs text-blue-600">{row.code}</code>
        </div>
      ),
    },
    { key: 'maxWeight', label: 'Max Weight' },
    { key: 'maxVolume', label: 'Max Volume' },
    { 
      key: 'count',
      label: 'Fleet Count',
      render: (value: number) => (
        <Badge variant="default">{value} vehicles</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary">✏️</Button>
          <Button size="sm" variant="ghost">🗑️</Button>
        </div>
      ),
    },
  ];

  const tabs = [
    {
      key: 'drivers',
      label: 'Sürücüler',
      icon: <span>👨‍✈️</span>,
      content: (
        <div>
          <div className="mb-4 flex gap-3">
            <Button variant="primary" onClick={() => setShowModal(true)}>➕ Add Driver</Button>
            <Button variant="secondary">⬇️ Export</Button>
            <Button variant="secondary">📊 Performance Report</Button>
          </div>
          <Table columns={driverColumns} data={drivers} />
        </div>
      ),
    },
    {
      key: 'carriers',
      label: 'Taşıyıcılar',
      icon: <span>🚛</span>,
      content: (
        <div>
          <div className="mb-4 flex gap-3">
            <Button variant="primary">➕ Add Carrier</Button>
            <Button variant="secondary">📊 Performance Analysis</Button>
          </div>
          <Table columns={carrierColumns} data={carriers} />
        </div>
      ),
    },
    {
      key: 'vehicleTypes',
      label: 'Araç Tipleri',
      icon: <span>🚚</span>,
      content: (
        <div>
          <div className="mb-4">
            <Button variant="primary">➕ Add Vehicle Type</Button>
          </div>
          <Table columns={vehicleTypeColumns} data={vehicleTypes} />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sürücü ve Taşıyıcı Yönetimi</h1>
            <p className="mt-2 text-gray-600">Sürücüleri, taşıyıcıları ve araç tiplerini yönetin</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <p className="text-sm text-gray-500">Toplam Sürücüler</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">52</p>
            <p className="mt-1 text-sm text-green-600">38 aktif</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Toplam Taşıyıcılar</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">12</p>
            <p className="mt-1 text-sm text-gray-600">8 tercih edilen</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Ortalama Puan</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">4.7</p>
            <p className="mt-1 text-sm text-gray-600">⭐ Yıldız</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Zamanında Teslimat</p>
            <p className="mt-2 text-3xl font-bold text-green-600">96.2%</p>
            <p className="mt-1 text-sm text-green-600">+2.1% bu ay</p>
          </Card>
        </div>

        <Card>
          <Tabs tabs={tabs} />
        </Card>

        {/* Expiring Documents Alert */}
        <Card className="mt-6 border-l-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Süresi Dolacak Belgeler (30 Gün İçinde)</h3>
          <div className="space-y-2">
            {[
              { driver: 'Mehmet Yılmaz', docType: 'Driver License', expiryDate: '2025-11-15' },
              { driver: 'Ali Kaya', docType: 'Medical Certificate', expiryDate: '2025-11-20' },
              { vehicle: '34ABC123', docType: 'Insurance', expiryDate: '2025-11-10' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-yellow-50 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900">{item.driver || item.vehicle}</p>
                  <p className="text-sm text-gray-600">{item.docType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-orange-600">Expires: {item.expiryDate}</p>
                  <Button size="sm" variant="warning" className="mt-1">Renew</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Yeni Sürücü Ekle"
        >
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" placeholder="Mehmet" required fullWidth />
              <Input label="Last Name" placeholder="Yılmaz" required fullWidth />
            </div>
            <Input label="License Number" placeholder="B-12345678" required fullWidth />
            <Input label="License Type" placeholder="B, C, D, E" required fullWidth />
            <Input label="License Expiry" type="date" required fullWidth />
            <Input label="Phone" placeholder="+90 555 123 4567" required fullWidth />
            <Input label="Email" type="email" placeholder="mehmet@example.com" fullWidth />
            
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm">Hazmat Certified</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                Add Driver
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

