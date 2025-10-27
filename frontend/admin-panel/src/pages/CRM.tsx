import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, Phone, Mail, BarChart3, Settings } from 'lucide-react';

const CRM: React.FC = () => {
  const crmModules = [
    {
      title: 'Müşteriler',
      description: 'Müşteri bilgileri ve geçmiş işlemler',
      icon: <Users className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 1250, completed: 1200, pending: 50 }
    },
    {
      title: 'Potansiyel Müşteriler',
      description: 'Lead yönetimi ve takip süreçleri',
      icon: <UserPlus className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 89, completed: 75, pending: 14 }
    },
    {
      title: 'İletişim',
      description: 'Müşteri iletişim geçmişi ve notlar',
      icon: <Phone className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 456, completed: 450, pending: 6 }
    },
    {
      title: 'Kampanyalar',
      description: 'Pazarlama kampanyaları ve e-posta gönderimi',
      icon: <Mail className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 12, completed: 10, pending: 2 }
    },
    {
      title: 'Analitik',
      description: 'Müşteri analizi ve satış raporları',
      icon: <BarChart3 className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 25, completed: 25, pending: 0 }
    },
    {
      title: 'Ayarlar',
      description: 'CRM konfigürasyon ve parametreler',
      icon: <Settings className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 8, completed: 8, pending: 0 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">CRM - Müşteri Yönetimi</h1>
        <p className="text-purple-100">Kapsamlı müşteri ilişkileri yönetimi</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Müşteri</p>
                <p className="text-2xl font-bold text-purple-600">1,250</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Lead</p>
                <p className="text-2xl font-bold text-blue-600">89</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bu Ay İletişim</p>
                <p className="text-2xl font-bold text-green-600">456</p>
              </div>
              <Phone className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Kampanya</p>
                <p className="text-2xl font-bold text-orange-600">12</p>
              </div>
              <Mail className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CRM Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {crmModules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
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
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
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
                  <p className="font-medium">Yeni müşteri kaydı oluşturuldu</p>
                  <p className="text-sm text-gray-600">10 dakika önce</p>
                </div>
              </div>
              <Badge variant="default">Tamamlandı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Lead takibi güncellendi</p>
                  <p className="text-sm text-gray-600">30 dakika önce</p>
                </div>
              </div>
              <Badge variant="secondary">Güncellendi</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">E-posta kampanyası başlatıldı</p>
                  <p className="text-sm text-gray-600">2 saat önce</p>
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

export default CRM;
