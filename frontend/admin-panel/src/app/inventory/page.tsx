'use client';

import { useState } from 'react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([
    { 
      id: 1, 
      sku: 'SKU-001', 
      name: 'Ürün A', 
      batches: [
        { lot: 'LOT-001', quantity: 100, location: 'A-01-01', receivedDate: '2025-10-20', expiryDate: '2026-10-20' },
        { lot: 'LOT-002', quantity: 50, location: 'A-01-02', receivedDate: '2025-10-22', expiryDate: '2026-10-22' },
      ]
    },
    { 
      id: 2, 
      sku: 'SKU-002', 
      name: 'Ürün B', 
      batches: [
        { lot: 'LOT-003', quantity: 75, location: 'A-02-01', receivedDate: '2025-10-18', expiryDate: '2026-10-18' },
      ]
    },
  ]);

  const getTotalStock = (product: any) => {
    return product.batches.reduce((sum: number, batch: any) => sum + batch.quantity, 0);
  };

  const getTotalInventory = () => {
    return inventory.reduce((sum, product) => sum + getTotalStock(product), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="glass rounded-2xl p-6 border border-white/10 mb-6">
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text mb-2">Envanter Yönetimi</h1>
          <p className="text-green-300">FIFO/FEFO takipli stok yönetimi</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(48,209,88,0.4)'}}>
            <div className="text-sm opacity-80">Toplam Stok</div>
            <div className="text-3xl font-bold">{getTotalInventory()}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(10,132,255,0.4)'}}>
            <div className="text-sm opacity-80">Ürün Çeşidi</div>
            <div className="text-3xl font-bold">{inventory.length}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(191,90,242,0.4)'}}>
            <div className="text-sm opacity-80">Toplam Lot</div>
            <div className="text-3xl font-bold">{inventory.reduce((sum, p) => sum + p.batches.length, 0)}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-4 text-white" style={{boxShadow: '0 0 20px rgba(255,159,10,0.4)'}}>
            <div className="text-sm opacity-80">Lokasyon Sayısı</div>
            <div className="text-3xl font-bold">{new Set(inventory.flatMap(p => p.batches.map(b => b.location))).size}</div>
          </div>
        </div>

        {/* Inventory List with FIFO */}
        <div className="glass rounded-2xl p-6 border border-white/10">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            📦 Envanter Listesi
            <span className="text-sm font-normal text-green-300">(FIFO/FEFO Sıralı)</span>
          </h3>
          
          <div className="space-y-6">
            {inventory.map((product) => (
              <div key={product.id} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      📦
                    </div>
                    <div>
                      <div className="font-bold text-white text-xl">{product.sku}</div>
                      <div className="text-sm text-green-300">{product.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{getTotalStock(product)}</div>
                    <div className="text-xs text-green-300">Toplam Stok</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-semibold text-green-400 mb-2">📊 Lot Detayları (FIFO Sıralı):</div>
                  {product.batches
                    .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime())
                    .map((batch, batchIndex) => (
                    <div key={batch.lot} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-green-400 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {batchIndex + 1}
                          </div>
                          <div>
                            <div className="font-bold text-white">{batch.lot}</div>
                            <div className="text-xs text-green-300">FIFO Sırası: {batchIndex + 1}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-white">{batch.quantity}</div>
                          <div className="text-xs text-green-300">Adet</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-green-300">Lokasyon:</span>
                          <div className="font-bold text-white mt-1">{batch.location}</div>
                        </div>
                        <div>
                          <span className="text-green-300">Giriş Tarihi:</span>
                          <div className="font-bold text-white mt-1">{batch.receivedDate}</div>
                        </div>
                        <div>
                          <span className="text-green-300">SKT:</span>
                          <div className="font-bold text-white mt-1">{batch.expiryDate}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FIFO Explanation */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="glass rounded-xl p-6 border border-green-500/30">
            <h4 className="text-lg font-bold text-green-400 mb-3">📥 FIFO (First In, First Out)</h4>
            <p className="text-white/80 text-sm leading-relaxed">
              İlk giren ürün, ilk çıkar prensibi. En eski tarihli lot'lar önce çıkış yapılır. 
              <strong className="text-green-400"> Gıda, ilaç, kozmetik</strong> gibi sektörlerde yasal zorunluluktur.
            </p>
          </div>
          <div className="glass rounded-xl p-6 border border-cyan-500/30">
            <h4 className="text-lg font-bold text-cyan-400 mb-3">📤 FEFO (First Expire, First Out)</h4>
            <p className="text-white/80 text-sm leading-relaxed">
              İlk sona erecek ürün, ilk çıkar prensibi. Son kullanma tarihi (SKT) en yakın olan lot'lar önce çıkış yapılır.
              <strong className="text-cyan-400"> Fire oranını minimize eder.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
