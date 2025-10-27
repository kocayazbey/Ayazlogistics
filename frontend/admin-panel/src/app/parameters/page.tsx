'use client';

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Modal, Table, Select, Tabs } from '@ayazlogistics/design-system';

export default function ParametersPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingParam, setEditingParam] = useState<any>(null);

  const categories = [
    { value: 'ALL', label: 'All Parameters', count: 95 },
    { value: 'CAPACITY_CONTROL', label: 'Capacity Control', count: 15 },
    { value: 'PICKFACE_CAPACITY', label: 'Pick Face', count: 8 },
    { value: 'FIFO_FEFO', label: 'FIFO/FEFO', count: 6 },
    { value: 'LOT_MIXING', label: 'Lot Mixing', count: 5 },
    { value: 'AUTO_ALLOCATION', label: 'Auto-Allocation', count: 8 },
    { value: 'QUALITY_CONTROL', label: 'Quality Control', count: 7 },
    { value: 'REPLENISHMENT', label: 'Replenishment', count: 6 },
    { value: 'CROSSDOCK', label: 'Cross-dock', count: 5 },
    { value: 'SAFETY', label: 'Safety', count: 4 },
    { value: 'TRACKING', label: 'Tracking', count: 5 },
    { value: 'LABELING', label: 'Labeling', count: 4 },
    { value: 'PICKING', label: 'Picking', count: 10 },
    { value: 'SYSTEM', label: 'System', count: 8 },
  ];

  const parameters = [
    { key: 'PALLET_MAX_HEIGHT_CM', category: 'CAPACITY_CONTROL', name: 'Maximum Pallet Height', nameTr: 'Maksimum Palet Yüksekliği', value: 180, unit: 'cm', type: 'NUMBER', editable: true },
    { key: 'PALLET_MAX_WEIGHT_KG', category: 'CAPACITY_CONTROL', name: 'Maximum Pallet Weight', nameTr: 'Maksimum Palet Ağırlığı', value: 1000, unit: 'kg', type: 'NUMBER', editable: true },
    { key: 'PALLET_CAPACITY_WARNING_PCT', category: 'CAPACITY_CONTROL', name: 'Capacity Warning %', nameTr: 'Kapasite Uyarı %', value: 90, unit: '%', type: 'NUMBER', editable: true },
    { key: 'FIFO_ENFORCEMENT', category: 'FIFO_FEFO', name: 'Enforce FIFO', nameTr: 'FIFO Zorla', value: true, type: 'BOOLEAN', editable: true },
    { key: 'FEFO_ENFORCEMENT', category: 'FIFO_FEFO', name: 'Enforce FEFO', nameTr: 'FEFO Zorla', value: false, type: 'BOOLEAN', editable: true },
    { key: 'PICKFACE_MAX_QUANTITY', category: 'PICKFACE_CAPACITY', name: 'Pick Face Max Quantity', nameTr: 'Toplama Gözü Maks Miktar', value: 500, unit: 'units', type: 'NUMBER', editable: true },
    { key: 'PICKFACE_REPLENISH_TRIGGER_PCT', category: 'PICKFACE_CAPACITY', name: 'Replenish Trigger %', nameTr: 'İkmal Tetikleme %', value: 20, unit: '%', type: 'NUMBER', editable: true },
    { key: 'ALLOW_LOT_MIXING_PALLET', category: 'LOT_MIXING', name: 'Allow Lot Mixing on Pallet', nameTr: 'Palette Lot Karışımına İzin Ver', value: false, type: 'BOOLEAN', editable: true },
    { key: 'AUTO_ALLOCATE_ON_RECEIVING', category: 'AUTO_ALLOCATION', name: 'Auto-allocate on Receiving', nameTr: 'Giriş Sırasında Otomatik Ayır', value: true, type: 'BOOLEAN', editable: true },
    { key: 'QC_REQUIRED_ON_RECEIVING', category: 'QUALITY_CONTROL', name: 'QC Required on Receiving', nameTr: 'Girişte Kalite Kontrol Gerekli', value: true, type: 'BOOLEAN', editable: true },
    { key: 'REPLENISH_AUTO_TRIGGER', category: 'REPLENISHMENT', name: 'Auto-trigger Replenishment', nameTr: 'Otomatik İkmal Tetikle', value: true, type: 'BOOLEAN', editable: true },
    { key: 'CROSSDOCK_ENABLED', category: 'CROSSDOCK', name: 'Cross-dock Enabled', nameTr: 'Cross-dock Etkin', value: true, type: 'BOOLEAN', editable: true },
    { key: 'HAZMAT_SEGREGATION', category: 'SAFETY', name: 'Hazmat Segregation', nameTr: 'Tehlikeli Madde Ayırımı', value: true, type: 'BOOLEAN', editable: true },
    { key: 'SERIAL_NUMBER_TRACKING', category: 'TRACKING', name: 'Serial Number Tracking', nameTr: 'Seri Numarası Takibi', value: false, type: 'BOOLEAN', editable: true },
    { key: 'LABEL_PRINT_AUTO', category: 'LABELING', name: 'Auto Print Labels', nameTr: 'Etiket Otomatik Yazdır', value: true, type: 'BOOLEAN', editable: true },
    { key: 'SHORT_PICK_ALLOWED', category: 'PICKING', name: 'Short Pick Allowed', nameTr: 'Eksik Toplamaya İzin Ver', value: true, type: 'BOOLEAN', editable: true },
    { key: 'SESSION_TIMEOUT_MINUTES', category: 'SYSTEM', name: 'Session Timeout', nameTr: 'Oturum Zaman Aşımı', value: 30, unit: 'minutes', type: 'NUMBER', editable: true },
  ];

  const filteredParams = parameters.filter((param) => {
    const matchesCategory = selectedCategory === 'ALL' || param.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.nameTr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      param.key.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const columns = [
    { 
      key: 'name', 
      label: 'Parameter Name',
      render: (value: string, row: any) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500">{row.nameTr}</p>
          <code className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{row.key}</code>
        </div>
      ),
    },
    { 
      key: 'category', 
      label: 'Category',
      render: (value: string) => (
        <Badge variant="default">{value.replace(/_/g, ' ')}</Badge>
      ),
    },
    {
      key: 'value',
      label: 'Current Value',
      render: (value: any, row: any) => (
        <div className="font-mono font-semibold">
          {row.type === 'BOOLEAN' ? (
            <Badge variant={value ? 'success' : 'error'}>
              {value ? '✓ True' : '✗ False'}
            </Badge>
          ) : (
            <span className="text-blue-600">
              {value} {row.unit || ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="primary"
            onClick={() => {
              setEditingParam(row);
              setShowModal(true);
            }}
            disabled={!row.editable}
          >
            ✏️ Edit
          </Button>
          <Button size="sm" variant="ghost">📊 History</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">İş Akışı Parametreleri</h1>
            <p className="mt-2 text-gray-600">Depo iş akış parametreleri - 95+ yapılandırma seçeneği</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">⬇️ Dışa Aktar</Button>
            <Button variant="secondary">⬆️ İçe Aktar</Button>
            <Button variant="primary">➕ Özel Parametre Ekle</Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.label}
                <span className={`ml-2 text-xs ${
                  selectedCategory === cat.value ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  ({cat.count})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <p className="text-sm text-gray-500">Toplam Parametreler</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">95</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Kategoriler</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">14</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Bugün Değiştirilen</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">8</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Onay Gerekli</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">23</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">Sistem Varsayılanı</p>
            <p className="mt-2 text-3xl font-bold text-gray-600">72</p>
          </Card>
        </div>

        {/* Parameters Table */}
        <Card>
          <div className="mb-4">
            <Input
              placeholder="İsim, Türkçe isim veya anahtara göre ara..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              fullWidth
              icon={<span>🔍</span>}
            />
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredParams.length}</span> parameters
              {selectedCategory !== 'ALL' && <span> in <span className="font-semibold">{selectedCategory.replace(/_/g, ' ')}</span></span>}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">🔄 Reset All to Default</Button>
              <Button size="sm" variant="secondary">💾 Save Template</Button>
            </div>
          </div>

          <Table columns={columns} data={filteredParams} />
        </Card>

        {/* Edit Parameter Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingParam(null);
          }}
          title={`Edit Parameter: ${editingParam?.name}`}
        >
          {editingParam && (
            <form className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 mb-1">{editingParam.name}</p>
                <p className="text-sm text-blue-700">{editingParam.nameTr}</p>
                <code className="text-xs text-blue-600 mt-2 block">{editingParam.key}</code>
              </div>

              {editingParam.type === 'BOOLEAN' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value / Değer
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="boolValue" value="true" defaultChecked={editingParam.value} />
                      <span className="text-sm font-medium text-green-700">✓ True / Evet</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="boolValue" value="false" defaultChecked={!editingParam.value} />
                      <span className="text-sm font-medium text-red-700">✗ False / Hayır</span>
                    </label>
                  </div>
                </div>
              ) : editingParam.type === 'NUMBER' ? (
                <div>
                  <Input
                    label={`Value (${editingParam.unit || 'units'})`}
                    type="number"
                    defaultValue={editingParam.value}
                    fullWidth
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Range: {editingParam.minValue || 0} - {editingParam.maxValue || '∞'}
                  </p>
                </div>
              ) : (
                <Input
                  label="Value / Değer"
                  defaultValue={editingParam.value}
                  fullWidth
                />
              )}

              <Input
                label="Change Reason / Değişiklik Nedeni"
                placeholder="Why are you changing this parameter?"
                fullWidth
              />

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ This parameter {editingParam.requiresApproval ? 'requires supervisor approval' : 'will be applied immediately'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" fullWidth onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="ghost" onClick={() => {
                  alert('Resetting to default value: ' + editingParam.defaultValue);
                }}>
                  🔄 Reset to Default
                </Button>
                <Button type="submit" variant="primary" fullWidth>
                  💾 Save Changes
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Parameter Templates */}
        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Parametre Şablonları</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Conservative', description: 'Strict controls, high safety', icon: '🔒' },
              { name: 'Balanced', description: 'Recommended settings', icon: '⚖️' },
              { name: 'Aggressive', description: 'High throughput, relaxed rules', icon: '🚀' },
            ].map((template, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                <div className="text-3xl mb-2">{template.icon}</div>
                <h4 className="font-semibold text-gray-900">{template.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                <Button size="sm" variant="ghost" className="mt-3 w-full">Apply Template</Button>
              </div>
            ))}
          </div>
        </Card>

        {/* Change History */}
        <Card className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Değişiklikler</h3>
          <div className="space-y-3">
            {[
              { param: 'FIFO_ENFORCEMENT', oldValue: 'false', newValue: 'true', changedBy: 'Admin', time: '2 hours ago', reason: 'Client requirement' },
              { param: 'PALLET_MAX_HEIGHT_CM', oldValue: '200', newValue: '180', changedBy: 'Supervisor', time: '1 day ago', reason: 'Safety compliance' },
            ].map((change, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-mono text-blue-600">{change.param}</code>
                  <span className="text-xs text-gray-500">{change.time}</span>
                </div>
                <div className="flex items-center gap-3 text-sm mb-2">
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded">{change.oldValue}</span>
                  <span className="text-gray-400">→</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded">{change.newValue}</span>
                </div>
                <p className="text-xs text-gray-600">
                  <span className="font-medium">{change.changedBy}</span>: {change.reason}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

