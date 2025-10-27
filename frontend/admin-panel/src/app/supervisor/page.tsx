'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal, Tabs, Select } from '@ayazlogistics/design-system';

export default function SupervisorPage() {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');

  const openModal = (type: string) => {
    setModalType(type);
    setShowModal(true);
  };

  const recentActivities = [
    { id: '1', action: 'Palet Blokaj Kaldırıldı', pallet: 'PLT-12345', supervisor: 'Ahmet Y.', time: '5 min ago', type: 'unblock' },
    { id: '2', action: 'Lot Numarası Değiştirildi', pallet: 'PLT-12346', supervisor: 'Mehmet K.', time: '15 min ago', type: 'modify' },
    { id: '3', action: 'ITS Kalite Kontrol', pallet: 'PLT-12347', supervisor: 'Ayşe D.', time: '1 hour ago', type: 'qc' },
  ];

  const pendingApprovals = [
    { id: '1', type: 'Location Change', requester: 'Operator-5', reason: 'Current location full', priority: 'high' },
    { id: '2', type: 'Lot Date Modify', requester: 'Operator-12', reason: 'Wrong entry', priority: 'normal' },
  ];

  const tabs = [
    {
      key: 'operations',
      label: 'Operasyonlar',
      icon: <span>⚙️</span>,
      content: (
        <div className="grid grid-cols-2 gap-4">
          <Button variant="primary" fullWidth onClick={() => openModal('pickface')}>
            Toplama Gözü Değiştir
          </Button>
          <Button variant="primary" fullWidth onClick={() => openModal('lot')}>
            Palet Lot & Tarih Değiştir
          </Button>
          <Button variant="primary" fullWidth onClick={() => openModal('block')}>
            Palet Blokaj Koy/Kaldır
          </Button>
          <Button variant="primary" fullWidth onClick={() => openModal('barcode')}>
            SKU Barkod Tanımla
          </Button>
          <Button variant="primary" fullWidth onClick={() => openModal('standards')}>
            SKU Palet Standartları
          </Button>
          <Button variant="primary" fullWidth onClick={() => openModal('its-qc')}>
            ITS Kalite Kontrol
          </Button>
        </div>
      ),
    },
    {
      key: 'activity',
      label: 'Son Aktiviteler',
      icon: <span>📋</span>,
      content: (
        <div className="space-y-3">
          {recentActivities.map(activity => (
            <div key={activity.id} className="bg-white rounded-xl mb-2 p-4 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-600">{activity.pallet} • {activity.supervisor}</p>
                </div>
                <div className="text-right">
                  <Badge variant={activity.type === 'qc' ? 'info' : activity.type === 'unblock' ? 'success' : 'warning'}>
                    {activity.type}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'approvals',
      label: 'Onay Bekleyenler',
      icon: <span>✓</span>,
      content: (
        <div className="space-y-3">
          {pendingApprovals.map(approval => (
            <div key={approval.id} className="bg-white rounded-xl mb-2 p-4 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{approval.type}</p>
                  <p className="text-sm text-gray-600">Requested by: {approval.requester}</p>
                  <p className="text-xs text-gray-500 mt-1">{approval.reason}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary">Approve</Button>
                  <Button size="sm" variant="destructive">Reject</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Süpervizör İşlemleri</h1>
          <p className="mt-2 text-gray-600">Özel operasyonlar ve onaylar</p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card hoverable>
            <p className="text-sm text-gray-500">Bugünkü İşlemler</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">24</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Onay Bekleyen</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">2</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Blokeli Paletler</p>
            <p className="mt-2 text-3xl font-bold text-red-600">8</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">QC (Kalite) Denetimleri</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">12</p>
          </Card>
        </div>

        <Card>
          <Tabs tabs={tabs} />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={getModalTitle(modalType)}>
          {modalType === 'block' && (
            <form className="space-y-4">
              <Input label="Pallet ID" placeholder="PLT-12345" required fullWidth />
              <Select
                label="Block Type"
                options={[
                  { label: 'Quality Issue', value: 'quality' },
                  { label: 'Damage', value: 'damage' },
                  { label: 'Expiry', value: 'expiry' },
                  { label: 'Investigation', value: 'investigation' },
                ]}
                required
                fullWidth
              />
              <Input label="Block Reason" placeholder="Detailed reason" required fullWidth />
              <Input label="Notes" placeholder="Additional notes" fullWidth />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="destructive" fullWidth>Block Pallet</Button>
              </div>
            </form>
          )}
          {modalType === 'lot' && (
            <form className="space-y-4">
              <Input label="Pallet ID" placeholder="PLT-12345" required fullWidth />
              <Input label="New Lot Number" placeholder="LOT-2025-001" required fullWidth />
              <Input label="Production Date" type="date" required fullWidth />
              <Input label="Expiry Date" type="date" required fullWidth />
              <Input label="Reason" placeholder="Why changing?" required fullWidth />
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" fullWidth>Update</Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
}

function getModalTitle(type: string) {
  const titles: { [key: string]: string } = {
    pickface: 'Toplama Gözü Değiştir',
    lot: 'Palet Lot & Tarih Değiştir',
    block: 'Palet Blokaj',
    barcode: 'SKU Barkod Tanımla',
    standards: 'Palet Standartları',
    'its-qc': 'ITS Kalite Kontrol',
  };
  return titles[type] || 'Supervisor Operation';
}

