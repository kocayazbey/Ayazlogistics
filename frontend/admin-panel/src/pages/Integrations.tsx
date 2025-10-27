import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Globe, Link, Settings, Zap } from 'lucide-react';

const Integrations: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-sky-600 to-sky-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Entegrasyonlar</h1>
        <p className="text-sky-100">Üçüncü parti entegrasyonlar</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Entegrasyon</p>
                <p className="text-2xl font-bold text-sky-600">12</p>
              </div>
              <Globe className="h-8 w-8 text-sky-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Integrations;
