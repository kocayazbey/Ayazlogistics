import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Database, Users, DollarSign, ShoppingCart, BarChart3, Settings } from 'lucide-react';

const ERP: React.FC = () => {
  const erpModules = [
    {
      title: 'Muhasebe',
      description: 'Finansal kayıtlar ve muhasebe işlemleri',
      icon: <DollarSign className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 1250, completed: 1200, pending: 50 }
    },
    {
      title: 'İnsan Kaynakları',
      description: 'Personel yönetimi ve bordro işlemleri',
      icon: <Users className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 156, completed: 150, pending: 6 }
    },
    {
      title: 'Satın Alma',
      description: 'Tedarikçi yönetimi ve satın alma süreçleri',
      icon: <ShoppingCart className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 89, completed: 85, pending: 4 }
    },
    {
      title: 'Envanter',
      description: 'Stok yönetimi ve envanter takibi',
      icon: <Database className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 2500, completed: 2400, pending: 100 }
    },
    {
      title: 'Raporlar',
      description: 'ERP analitik ve performans raporları',
      icon: <BarChart3 className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 25, completed: 25, pending: 0 }
    },
    {
      title: 'Ayarlar',
      description: 'ERP konfigürasyon ve parametreler',
      icon: <Settings className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 12, completed: 12, pending: 0 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">ERP - Kurumsal Kaynak</h1>
        <p className="text-indigo-100">Kapsamlı kurumsal kaynak planlama</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Ciro</p>
                <p className="text-2xl font-bold text-indigo-600">₺2.5M</p>
              </div>
              <DollarSign className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Personel</p>
                <p className="text-2xl font-bold text-blue-600">156</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Tedarikçi</p>
                <p className="text-2xl font-bold text-green-600">89</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Envanter Öğesi</p>
                <p className="text-2xl font-bold text-purple-600">2,500</p>
              </div>
              <Database className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ERP Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {erpModules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
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
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
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
                  <p className="font-medium">Aylık bordro işlemleri tamamlandı</p>
                  <p className="text-sm text-gray-600">1 saat önce</p>
                </div>
              </div>
              <Badge variant="default">Tamamlandı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Yeni tedarikçi sözleşmesi imzalandı</p>
                  <p className="text-sm text-gray-600">3 saat önce</p>
                </div>
              </div>
              <Badge variant="secondary">İmzalandı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Envanter sayımı başlatıldı</p>
                  <p className="text-sm text-gray-600">1 gün önce</p>
                </div>
              </div>
              <Badge variant="outline">Başlatıldı</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ERP;
