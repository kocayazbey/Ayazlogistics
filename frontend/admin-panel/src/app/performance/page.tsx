'use client';

import React from 'react';
import { Card, Badge, Tabs } from '@ayazlogistics/design-system';

export default function PerformancePage() {
  const personnelData = [
    { name: 'Ahmet Y.', role: 'Picker', tasksCompleted: 145, avgTime: '3.2 min', efficiency: 95, rating: 'A' },
    { name: 'Mehmet K.', role: 'Forklift Operator', tasksCompleted: 89, avgTime: '4.5 min', efficiency: 88, rating: 'B' },
    { name: 'Ayşe D.', role: 'Packer', tasksCompleted: 210, avgTime: '2.8 min', efficiency: 97, rating: 'A' },
  ];

  const forkliftData = [
    { id: 'FLT-001', type: 'RT', operator: 'Mehmet K.', tasksCompleted: 89, utilization: 78, avgDuration: '4.5 min' },
    { id: 'FLT-002', type: 'TT', operator: 'Ali R.', tasksCompleted: 56, utilization: 65, avgDuration: '6.2 min' },
  ];

  const supplierData = [
    { name: 'Supplier A', onTimeDelivery: 95, qualityScore: 92, leadTime: '3.5 days', rating: 4.5 },
    { name: 'Supplier B', onTimeDelivery: 87, qualityScore: 89, leadTime: '4.2 days', rating: 4.2 },
  ];

  const tabs = [
    {
      key: 'personnel',
      label: 'Personel',
      icon: <span>👥</span>,
      content: (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {personnelData.map((person, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{person.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{person.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{person.tasksCompleted}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{person.avgTime}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="h-full bg-green-600 rounded-full" style={{ width: `${person.efficiency}%` }} />
                      </div>
                      <span>{person.efficiency}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={person.rating === 'A' ? 'success' : 'warning'}>{person.rating}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ),
    },
    {
      key: 'forklift',
      label: 'Forklift',
      icon: <span>🚜</span>,
      content: (
        <div className="space-y-4">
          {forkliftData.map(forklift => (
            <Card key={forklift.id} hoverable>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{forklift.id} - {forklift.type}</p>
                  <p className="text-sm text-gray-600">Operator: {forklift.operator}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{forklift.utilization}%</p>
                  <p className="text-xs text-gray-500">Utilization</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Tasks</p>
                  <p className="text-lg font-semibold">{forklift.tasksCompleted}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Avg Duration</p>
                  <p className="text-lg font-semibold">{forklift.avgDuration}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Efficiency</p>
                  <Badge variant="success">{forklift.utilization}%</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
    {
      key: 'supplier',
      label: 'Tedarikçiler',
      icon: <span>📦</span>,
      content: (
        <div className="space-y-4">
          {supplierData.map((supplier, idx) => (
            <Card key={idx} hoverable>
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-gray-900">{supplier.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">★</span>
                  <span className="font-semibold">{supplier.rating}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">On-Time Delivery</p>
                  <p className="text-xl font-bold text-green-600">{supplier.onTimeDelivery}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quality Score</p>
                  <p className="text-xl font-bold text-blue-600">{supplier.qualityScore}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Lead Time</p>
                  <p className="text-xl font-bold text-gray-900">{supplier.leadTime}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Performans Analitiği</h1>
          <p className="mt-2 text-gray-600">Personel, ekipman ve tedarikçi performansı</p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-6">
          <Card hoverable>
            <p className="text-sm text-gray-500">Ort. Toplayıcı Verimliliği</p>
            <p className="mt-2 text-3xl font-bold text-green-600">%93</p>
            <p className="mt-1 text-sm text-green-600">+%5 geçen aya göre</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Forklift Kullanım Oranı</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">%72</p>
            <p className="mt-1 text-sm text-gray-600">12 aktif ünite</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Tedarikçi Zamanında Teslimat</p>
            <p className="mt-2 text-3xl font-bold text-green-600">%91</p>
            <p className="mt-1 text-sm text-gray-600">Hedef: %95</p>
          </Card>
          <Card hoverable>
            <p className="text-sm text-gray-500">Sipariş Hazırlık Süresi</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">24 dk</p>
            <p className="mt-1 text-sm text-green-600">-%8 geçen aya göre</p>
          </Card>
        </div>

        <Card>
          <Tabs tabs={tabs} />
        </Card>
      </div>
    </div>
  );
}

