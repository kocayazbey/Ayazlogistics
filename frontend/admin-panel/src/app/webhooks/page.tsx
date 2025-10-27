'use client';

import React, { useState } from 'react';
import { LinkIcon, CheckCircleIcon, XCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function WebhooksManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const webhooks = [
    { id: 'wh_1', url: 'https://api.example.com/webhook', events: ['shipment.created', 'shipment.updated'], active: true, lastTriggered: '2025-10-24 14:30:00', successRate: 98 },
    { id: 'wh_2', url: 'https://erp.company.com/logistics-hook', events: ['invoice.created', 'invoice.paid'], active: true, lastTriggered: '2025-10-24 12:15:00', successRate: 100 },
    { id: 'wh_3', url: 'https://analytics.example.com/events', events: ['order.completed'], active: false, lastTriggered: '2025-10-20 09:45:00', successRate: 85 },
  ];

  const availableEvents = [
    { name: 'shipment.created', description: 'Triggered when a shipment is created' },
    { name: 'shipment.updated', description: 'Triggered when a shipment is updated' },
    { name: 'shipment.delivered', description: 'Triggered when a shipment is delivered' },
    { name: 'invoice.created', description: 'Triggered when an invoice is generated' },
    { name: 'invoice.paid', description: 'Triggered when an invoice is paid' },
    { name: 'order.created', description: 'Triggered when an order is created' },
    { name: 'order.completed', description: 'Triggered when an order is completed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Webhook Yönetimi</h1>
            <p className="text-gray-600">Gerçek zamanlı olay bildirimleri için webhook yapılandırın</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Webhook Oluştur
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Aktif Webhook\'ler', value: '2', color: 'green' },
            { label: 'Toplam Olaylar', value: '1,245', color: 'blue' },
            { label: 'Başarı Oranı', value: '97.8%', color: 'purple' },
            { label: 'Bugün Başarısız', value: '3', color: 'red' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow-sm border p-6">
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Webhooks Table */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="px-6 py-5 border-b">
            <h2 className="text-xl font-bold text-gray-900">Yapılandırılmış Webhook'ler</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Webhook URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Triggered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {webhooks.map((webhook) => (
                  <tr key={webhook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-900">{webhook.url}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <span key={event} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {event}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        webhook.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {webhook.active ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                        {webhook.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{webhook.successRate}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{webhook.lastTriggered}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Test</button>
                        <button className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Events */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-6 py-5 border-b">
            <h2 className="text-xl font-bold text-gray-900">Mevcut Olaylar</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableEvents.map((event) => (
                <div key={event.name} className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-mono text-sm font-semibold text-gray-900 mb-1">{event.name}</h3>
                  <p className="text-xs text-gray-600">{event.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

