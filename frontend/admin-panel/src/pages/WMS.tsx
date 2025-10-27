import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Package, Warehouse, Truck, BarChart3, Settings } from 'lucide-react';

const WMS: React.FC = () => {
  const wmsModules = [
    {
      title: 'Depo Operasyonları',
      description: 'Depo giriş, çıkış ve transfer işlemleri',
      icon: <Package className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 156, completed: 142, pending: 14 }
    },
    {
      title: 'Stok Yönetimi',
      description: 'Envanter takibi ve stok optimizasyonu',
      icon: <Warehouse className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 1250, completed: 1200, pending: 50 }
    },
    {
      title: 'Sevkiyat',
      description: 'Kargo hazırlama ve gönderim işlemleri',
      icon: <Truck className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 89, completed: 75, pending: 14 }
    },
    {
      title: 'Raporlar',
      description: 'WMS performans ve analitik raporları',
      icon: <BarChart3 className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 25, completed: 25, pending: 0 }
    },
    {
      title: 'Ayarlar',
      description: 'WMS konfigürasyon ve parametreler',
      icon: <Settings className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 12, completed: 12, pending: 0 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">WMS - Depo Yönetimi</h1>
        <p className="text-blue-100">Kapsamlı depo yönetim sistemi</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Operasyon</p>
                <p className="text-2xl font-bold text-blue-600">1,532</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Depolar</p>
                <p className="text-2xl font-bold text-green-600">8</p>
              </div>
              <Warehouse className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bekleyen Sevkiyat</p>
                <p className="text-2xl font-bold text-orange-600">14</p>
              </div>
              <Truck className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verimlilik</p>
                <p className="text-2xl font-bold text-purple-600">94%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WMS Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wmsModules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    {module.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <p className="text-sm text-gray-600">{module.description}</p>
                  </div>
                </div>
                <Badge variant="default">{module.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Toplam: {module.metrics.total}</span>
                  <span>Tamamlanan: {module.metrics.completed}</span>
                  <span>Bekleyen: {module.metrics.pending}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(module.metrics.completed / module.metrics.total) * 100}%` }}
                  />
                </div>
                <Button className="w-full" variant="outline">
                  Modülü Aç
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Son Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Depo A-01'de yeni ürün alımı tamamlandı</p>
                  <p className="text-sm text-gray-600">2 dakika önce</p>
                </div>
              </div>
              <Badge variant="default">Tamamlandı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Sevkiyat #SH-001 hazırlandı</p>
                  <p className="text-sm text-gray-600">15 dakika önce</p>
                </div>
              </div>
              <Badge variant="secondary">İşlemde</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Stok sayımı başlatıldı</p>
                  <p className="text-sm text-gray-600">1 saat önce</p>
                </div>
              </div>
              <Badge variant="outline">Beklemede</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WMS;
