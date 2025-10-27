import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Route, Truck, Users, MapPin, BarChart3, Settings } from 'lucide-react';

const TMS: React.FC = () => {
  const tmsModules = [
    {
      title: 'Rota Optimizasyonu',
      description: 'Akıllı rota planlama ve optimizasyon',
      icon: <Route className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 45, completed: 42, pending: 3 }
    },
    {
      title: 'Araç Yönetimi',
      description: 'Filo yönetimi ve araç takibi',
      icon: <Truck className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 28, completed: 25, pending: 3 }
    },
    {
      title: 'Sürücü Yönetimi',
      description: 'Sürücü performansı ve görev atama',
      icon: <Users className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 156, completed: 150, pending: 6 }
    },
    {
      title: 'GPS Takip',
      description: 'Gerçek zamanlı konum takibi',
      icon: <MapPin className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 89, completed: 89, pending: 0 }
    },
    {
      title: 'Analitik',
      description: 'Taşıma performansı ve maliyet analizi',
      icon: <BarChart3 className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 12, completed: 12, pending: 0 }
    },
    {
      title: 'Ayarlar',
      description: 'TMS konfigürasyon ve parametreler',
      icon: <Settings className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 8, completed: 8, pending: 0 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">TMS - Taşıma Yönetimi</h1>
        <p className="text-green-100">Kapsamlı taşıma ve lojistik yönetimi</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Rotalar</p>
                <p className="text-2xl font-bold text-green-600">45</p>
              </div>
              <Route className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Araçlar</p>
                <p className="text-2xl font-bold text-blue-600">28</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Sürücüler</p>
                <p className="text-2xl font-bold text-purple-600">156</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Takip Edilen</p>
                <p className="text-2xl font-bold text-orange-600">89</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TMS Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tmsModules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
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
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
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
                  <p className="font-medium">Rota #RT-001 optimizasyonu tamamlandı</p>
                  <p className="text-sm text-gray-600">5 dakika önce</p>
                </div>
              </div>
              <Badge variant="default">Tamamlandı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Araç #VH-003 yola çıktı</p>
                  <p className="text-sm text-gray-600">20 dakika önce</p>
                </div>
              </div>
              <Badge variant="secondary">Yolda</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Yeni sürücü ataması yapıldı</p>
                  <p className="text-sm text-gray-600">1 saat önce</p>
                </div>
              </div>
              <Badge variant="outline">Atandı</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TMS;
