import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileText, CreditCard, DollarSign, BarChart3, Settings } from 'lucide-react';

const Billing: React.FC = () => {
  const billingModules = [
    {
      title: 'Faturalar',
      description: 'Fatura oluşturma ve yönetimi',
      icon: <FileText className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 1250, completed: 1200, pending: 50 }
    },
    {
      title: 'Sözleşmeler',
      description: 'Müşteri sözleşmeleri ve yönetimi',
      icon: <CreditCard className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 89, completed: 85, pending: 4 }
    },
    {
      title: 'Ödemeler',
      description: 'Ödeme takibi ve tahsilat işlemleri',
      icon: <DollarSign className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 456, completed: 450, pending: 6 }
    },
    {
      title: 'Raporlar',
      description: 'Faturalama analitik ve raporları',
      icon: <BarChart3 className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 25, completed: 25, pending: 0 }
    },
    {
      title: 'Ayarlar',
      description: 'Faturalama konfigürasyon ve parametreler',
      icon: <Settings className="h-8 w-8" />,
      status: 'active',
      metrics: { total: 12, completed: 12, pending: 0 }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Faturalama</h1>
        <p className="text-orange-100">Kapsamlı faturalama ve ödeme yönetimi</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Fatura</p>
                <p className="text-2xl font-bold text-orange-600">1,250</p>
              </div>
              <FileText className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Sözleşme</p>
                <p className="text-2xl font-bold text-blue-600">89</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bu Ay Ödeme</p>
                <p className="text-2xl font-bold text-green-600">₺456K</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bekleyen Tahsilat</p>
                <p className="text-2xl font-bold text-red-600">₺125K</p>
              </div>
              <BarChart3 className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {billingModules.map((module, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
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
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300"
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
                  <p className="font-medium">Fatura #INV-001 oluşturuldu</p>
                  <p className="text-sm text-gray-600">15 dakika önce</p>
                </div>
              </div>
              <Badge variant="default">Oluşturuldu</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Ödeme #PAY-002 alındı</p>
                  <p className="text-sm text-gray-600">1 saat önce</p>
                </div>
              </div>
              <Badge variant="secondary">Alındı</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div>
                  <p className="font-medium">Sözleşme yenileme hatırlatması</p>
                  <p className="text-sm text-gray-600">2 saat önce</p>
                </div>
              </div>
              <Badge variant="outline">Hatırlatma</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
