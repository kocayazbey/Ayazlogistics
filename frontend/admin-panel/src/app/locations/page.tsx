'use client';

import React, { useState } from 'react';
import { 
  MapPinIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function LocationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocation, setNewLocation] = useState({
    code: '',
    name: '',
    type: 'storage',
    zone: '',
    aisle: '',
    shelf: '',
    level: '',
    capacity: '',
    status: 'active'
  });

  const locations = [
    {
      id: 1,
      code: 'A-01-01-01',
      name: 'A Zone, Aisle 1, Shelf 1, Level 1',
      type: 'storage',
      zone: 'A',
      aisle: '01',
      shelf: '01',
      level: '01',
      capacity: '100 pallets',
      status: 'active',
      utilization: 85
    },
    {
      id: 2,
      code: 'A-01-01-02',
      name: 'A Zone, Aisle 1, Shelf 1, Level 2',
      type: 'storage',
      zone: 'A',
      aisle: '01',
      shelf: '01',
      level: '02',
      capacity: '100 pallets',
      status: 'active',
      utilization: 92
    },
    {
      id: 3,
      code: 'B-02-03-01',
      name: 'B Zone, Aisle 2, Shelf 3, Level 1',
      type: 'picking',
      zone: 'B',
      aisle: '02',
      shelf: '03',
      level: '01',
      capacity: '50 pallets',
      status: 'maintenance',
      utilization: 0
    },
    {
      id: 4,
      code: 'C-03-01-01',
      name: 'C Zone, Aisle 3, Shelf 1, Level 1',
      type: 'cold-storage',
      zone: 'C',
      aisle: '03',
      shelf: '01',
      level: '01',
      capacity: '75 pallets',
      status: 'active',
      utilization: 68
    }
  ];

  const filteredLocations = locations.filter(location =>
    location.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.zone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'storage': return 'bg-blue-100 text-blue-800';
      case 'picking': return 'bg-purple-100 text-purple-800';
      case 'cold-storage': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const addLocation = () => {
    if (newLocation.code && newLocation.name) {
      // Here you would typically send the data to your backend
      console.log('Adding location:', newLocation);
      setNewLocation({
        code: '',
        name: '',
        type: 'storage',
        zone: '',
        aisle: '',
        shelf: '',
        level: '',
        capacity: '',
        status: 'active'
      });
      setShowAddModal(false);
      alert('Lokasyon başarıyla eklendi!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Lokasyon Yönetimi</h1>
            <p className="text-xl text-gray-600">Depo lokasyonlarını yönetin ve organize edin</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Yeni Lokasyon
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Toplam Lokasyon</p>
            <p className="text-3xl font-bold text-gray-900">{locations.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Aktif Lokasyon</p>
            <p className="text-3xl font-bold text-green-600">{locations.filter(l => l.status === 'active').length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Ortalama Kullanım</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(locations.reduce((sum, l) => sum + l.utilization, 0) / locations.length)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <p className="text-gray-600 text-sm mb-1">Bakımda</p>
            <p className="text-3xl font-bold text-yellow-600">{locations.filter(l => l.status === 'maintenance').length}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Lokasyon ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              Filtrele
            </button>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Kod</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Lokasyon</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Kapasite</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Kullanım</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLocations.map((location) => (
                  <tr key={location.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPinIcon className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="font-medium text-gray-900">{location.code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{location.name}</div>
                      <div className="text-sm text-gray-500">Zone: {location.zone} | Aisle: {location.aisle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(location.type)}`}>
                        {location.type.replace('-', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{location.capacity}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-20 h-2 bg-gray-200 rounded-full mr-2">
                          <div 
                            className="h-2 bg-blue-600 rounded-full" 
                            style={{ width: `${location.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{location.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(location.status)}`}>
                        {location.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Location Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Yeni Lokasyon Ekle</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lokasyon Kodu</label>
                    <input
                      type="text"
                      value={newLocation.code}
                      onChange={(e) => setNewLocation({...newLocation, code: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="A-01-01-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lokasyon Adı</label>
                    <input
                      type="text"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="A Zone, Aisle 1, Shelf 1, Level 1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tip</label>
                    <select
                      value={newLocation.type}
                      onChange={(e) => setNewLocation({...newLocation, type: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="storage">Depolama</option>
                      <option value="picking">Toplama</option>
                      <option value="cold-storage">Soğuk Depo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kapasite</label>
                    <input
                      type="text"
                      value={newLocation.capacity}
                      onChange={(e) => setNewLocation({...newLocation, capacity: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="100 pallets"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
                    <input
                      type="text"
                      value={newLocation.zone}
                      onChange={(e) => setNewLocation({...newLocation, zone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aisle</label>
                    <input
                      type="text"
                      value={newLocation.aisle}
                      onChange={(e) => setNewLocation({...newLocation, aisle: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shelf</label>
                    <input
                      type="text"
                      value={newLocation.shelf}
                      onChange={(e) => setNewLocation({...newLocation, shelf: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                    <input
                      type="text"
                      value={newLocation.level}
                      onChange={(e) => setNewLocation({...newLocation, level: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="01"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={addLocation}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Lokasyon Ekle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

