'use client';

import { useState } from 'react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([
    { id: 1, name: 'ABC Tekstil A.Ş.', email: 'info@abctekstil.com', phone: '+90 212 555 0001', type: 'E-Ticaret', status: 'active' },
    { id: 2, name: 'XYZ Elektronik Ltd.', email: 'contact@xyzelektronik.com', phone: '+90 216 555 0002', type: 'Üretici', status: 'active' },
  ]);

  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '', type: 'E-Ticaret' });
  const [showForm, setShowForm] = useState(false);

  const addCustomer = () => {
    if (newCustomer.name && newCustomer.email && newCustomer.phone) {
      setCustomers([...customers, {
        id: customers.length + 1,
        ...newCustomer,
        status: 'active'
      }]);
      setNewCustomer({ name: '', email: '', phone: '', type: 'E-Ticaret' });
      setShowForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text mb-2">Müşteri Yönetimi</h1>
              <p className="text-purple-300">Tüm müşterilerinizi buradan yönetin</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
              style={{boxShadow: '0 0 25px rgba(191,90,242,0.5)'}}
            >
              {showForm ? '✕ İptal' : '➕ Yeni Müşteri'}
            </button>
          </div>
        </div>

        {/* Add Customer Form */}
        {showForm && (
          <div className="glass rounded-2xl p-6 border border-white/10 mb-6">
            <h3 className="text-xl font-bold text-white mb-4">🆕 Yeni Müşteri Ekle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Firma Adı"
                value={newCustomer.name}
                onChange={(e: any) => setNewCustomer({...newCustomer, name: e.target.value})}
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
              <input
                type="email"
                placeholder="E-posta"
                value={newCustomer.email}
                onChange={(e: any) => setNewCustomer({...newCustomer, email: e.target.value})}
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
              <input
                type="tel"
                placeholder="Telefon"
                value={newCustomer.phone}
                onChange={(e: any) => setNewCustomer({...newCustomer, phone: e.target.value})}
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              />
              <select
                value={newCustomer.type}
                onChange={(e: any) => setNewCustomer({...newCustomer, type: e.target.value})}
                className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
              >
                <option value="E-Ticaret">E-Ticaret</option>
                <option value="Üretici">Üretici</option>
                <option value="Perakende">Perakende</option>
                <option value="Toptan">Toptan</option>
              </select>
            </div>
            <button
              onClick={addCustomer}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:scale-105 transition-all duration-300 shadow-lg"
              style={{boxShadow: '0 0 25px rgba(191,90,242,0.5)'}}
            >
              ✅ Müşteri Ekle
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(191,90,242,0.4)'}}>
            <div className="text-sm opacity-80">Toplam Müşteri</div>
            <div className="text-3xl font-bold">{customers.length}</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(48,209,88,0.4)'}}>
            <div className="text-sm opacity-80">Aktif</div>
            <div className="text-3xl font-bold">{customers.filter(c => c.status === 'active').length}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(10,132,255,0.4)'}}>
            <div className="text-sm opacity-80">E-Ticaret</div>
            <div className="text-3xl font-bold">{customers.filter(c => c.type === 'E-Ticaret').length}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(255,159,10,0.4)'}}>
            <div className="text-sm opacity-80">Üretici</div>
            <div className="text-3xl font-bold">{customers.filter(c => c.type === 'Üretici').length}</div>
          </div>
        </div>

        {/* Customer List */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-6">👥 Müşteri Listesi</h3>
          <div className="space-y-3">
            {customers.map((customer) => (
              <div key={customer.id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-400 hover:bg-white/10 transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{customer.name}</div>
                      <div className="text-sm text-purple-300">{customer.type}</div>
                    </div>
                  </div>
                  <div className="px-4 py-2 rounded-full text-sm font-semibold bg-green-500/20 text-green-400 border border-green-500/50">
                    ✓ Aktif
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-purple-300">E-posta:</span>
                    <span className="ml-2 text-white">{customer.email}</span>
                  </div>
                  <div>
                    <span className="text-purple-300">Telefon:</span>
                    <span className="ml-2 text-white">{customer.phone}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
