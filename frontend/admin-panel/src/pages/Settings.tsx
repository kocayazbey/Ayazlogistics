import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Settings, User, Bell, Shield } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-600 to-gray-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Ayarlar</h1>
        <p className="text-gray-100">Sistem ayarları ve konfigürasyon</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Genel Ayarlar</p>
                <p className="text-2xl font-bold text-gray-600">12</p>
              </div>
              <Settings className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
