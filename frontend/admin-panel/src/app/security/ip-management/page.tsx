'use client';

import React, { useState } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function IPManagement() {
  const [showAddModal, setShowAddModal] = useState(false);

  const whitelist = [
    { ip: '203.0.113.50', reason: 'Corporate Office', addedBy: 'Admin', addedDate: '2025-10-01' },
    { ip: '198.51.100.10', reason: 'VPN Gateway', addedBy: 'Security Team', addedDate: '2025-09-15' },
  ];

  const blacklist = [
    { ip: '192.0.2.100', reason: 'Multiple failed login attempts', blockedDate: '2025-10-24', expires: 'Permanent' },
    { ip: '198.51.100.200', reason: 'Suspicious activity detected', blockedDate: '2025-10-23', expires: '2025-10-30' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">IP Address Management</h1>
            <p className="text-gray-600">Manage whitelist and blacklist for security</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              <p className="text-gray-600">Whitelisted IPs</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{whitelist.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldExclamationIcon className="w-6 h-6 text-red-600" />
              <p className="text-gray-600">Blacklisted IPs</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{blacklist.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldExclamationIcon className="w-6 h-6 text-yellow-600" />
              <p className="text-gray-600">Temp Blocked</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">5</p>
          </div>
        </div>

        {/* Whitelist */}
        <div className="bg-white rounded-2xl shadow-sm border mb-8">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Whitelist</h2>
            <button className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Add to Whitelist
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {whitelist.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{item.ip}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.addedBy}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.addedDate}</td>
                  <td className="px-6 py-4">
                    <button className="text-red-600 hover:text-red-800 text-sm font-medium">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Blacklist */}
        <div className="bg-white rounded-2xl shadow-sm border">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Blacklist</h2>
            <button className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 flex items-center gap-2">
              <PlusIcon className="w-5 h-5" />
              Add to Blacklist
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blocked Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blacklist.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{item.ip}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.blockedDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.expires === 'Permanent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.expires}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Unblock</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

