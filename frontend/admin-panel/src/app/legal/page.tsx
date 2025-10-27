'use client';

import React from 'react';
import { DocumentTextIcon, ScaleIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function LegalManagement() {
  const contracts = [
    { id: 'CTR-001', client: 'ABC Corp', type: 'Service Agreement', status: 'active', expiryDate: '2026-12-31', value: '₺500,000' },
    { id: 'CTR-002', client: 'XYZ Ltd', type: 'NDA', status: 'pending_renewal', expiryDate: '2025-11-15', value: '-' },
    { id: 'CTR-003', client: 'Global Inc', type: 'Partnership', status: 'in_review', expiryDate: '2027-06-30', value: '₺1,200,000' },
  ];

  const complianceItems = [
    { area: 'GDPR Compliance', status: 'compliant', lastAudit: '2025-10-01', nextReview: '2026-01-01' },
    { area: 'KVKK Compliance', status: 'compliant', lastAudit: '2025-09-15', nextReview: '2025-12-15' },
    { area: 'ISO 27001', status: 'action_required', lastAudit: '2025-08-20', nextReview: '2025-11-20' },
    { area: 'SOX Compliance', status: 'compliant', lastAudit: '2025-10-10', nextReview: '2026-04-10' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hukuk ve Uyumluluk Yönetimi</h1>
          <p className="text-gray-600">Sözleşmeleri, uyumluluğu ve hukuki dokümanları yönetin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { icon: DocumentTextIcon, label: 'Aktif Sözleşmeler', value: '45', color: 'blue' },
            { icon: ExclamationTriangleIcon, label: 'İnceleme Bekleyen', value: '8', color: 'yellow' },
            { icon: ShieldCheckIcon, label: 'Uyumluluk Skoru', value: '98%', color: 'green' },
            { icon: ScaleIcon, label: 'Hukuki Talepler', value: '12', color: 'purple' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 bg-${stat.color}-50 rounded-xl`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Contracts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Aktif Sözleşmeler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{contract.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.client}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contract.status === 'active' ? 'bg-green-100 text-green-800' :
                        contract.status === 'pending_renewal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{contract.expiryDate}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{contract.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Uyumluluk Durumu</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {complianceItems.map((item) => (
                <div key={item.area} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.area}</h3>
                    <p className="text-sm text-gray-600">Last Audit: {item.lastAudit} | Next Review: {item.nextReview}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-sm font-medium ${
                    item.status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status === 'compliant' ? '✓ Compliant' : '⚠ Action Required'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

