'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal, Table } from '@ayazlogistics/design-system';

export default function DocumentsPage() {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const documents = [
    { id: '1', name: 'Annual Contract 2025.pdf', type: 'Contract', customer: 'Acme Corporation', uploadedBy: 'John Smith', date: '2025-10-15', size: '2.4 MB', status: 'signed' },
    { id: '2', name: 'Invoice INV-2025-001.pdf', type: 'Invoice', customer: 'Global Logistics', uploadedBy: 'System', date: '2025-10-14', size: '890 KB', status: 'sent' },
    { id: '3', name: 'Proposal TechStore.pdf', type: 'Proposal', customer: 'TechStore Inc', uploadedBy: 'Jane Doe', date: '2025-10-12', size: '3.1 MB', status: 'pending' },
    { id: '4', name: 'Delivery Report DR-001.pdf', type: 'Report', customer: 'FoodChain Co', uploadedBy: 'Bob Wilson', date: '2025-10-10', size: '1.2 MB', status: 'signed' },
    { id: '5', name: 'CMR Document.pdf', type: 'CMR', customer: 'Acme Corporation', uploadedBy: 'System', date: '2025-10-08', size: '650 KB', status: 'signed' },
  ];

  const columns = [
    {
      key: 'name',
      label: 'Document Name',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <span className="text-2xl">📄</span>
          <span className="font-medium">{value}</span>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => <Badge variant="info">{value}</Badge>,
    },
    { key: 'customer', label: 'Customer' },
    { key: 'uploadedBy', label: 'Uploaded By' },
    { key: 'date', label: 'Date' },
    { key: 'size', label: 'Size' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'signed' ? 'success' : value === 'sent' ? 'info' : 'warning'} dot>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost">👁️</Button>
          <Button size="sm" variant="ghost">⬇️</Button>
          <Button size="sm" variant="ghost">📧</Button>
          <Button size="sm" variant="ghost">🗑️</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Doküman Yönetimi</h1>
            <p className="mt-2 text-gray-600">Sözleşmeleri, faturaları ve diğer dokümanları yönetin</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">Şablonlar</Button>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              ⬆️ Doküman Yükle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <Card hoverable>
            <p className="text-sm text-gray-500">Toplam Dokümanlar</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">2,456</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Sözleşmeler</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">142</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Faturalar</p>
            <p className="mt-2 text-3xl font-bold text-green-600">1,234</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">İmza Bekleyen</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">12</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Kullanılan Depolama</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">12.4 GB</p>
          </Card>
        </div>

        <Card>
          <div className="mb-4 flex gap-3">
            <Input
              placeholder="Doküman ara..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              fullWidth
              icon={<span>🔍</span>}
            />
            <Button variant="secondary">Filtreler</Button>
          </div>
          <Table columns={columns} data={documents} />
        </Card>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Doküman Yükle">
          <form className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <div className="text-5xl mb-4">📁</div>
              <p className="text-sm text-gray-600 mb-2">
                <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX (max 10MB)</p>
            </div>
            <Input label="Document Name" placeholder="Enter document name" required fullWidth />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Document Type" placeholder="Contract" required fullWidth />
              <Input label="Customer" placeholder="Select customer" required fullWidth />
            </div>
            <Input label="Description" placeholder="Optional description" fullWidth />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                Upload Document
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}

