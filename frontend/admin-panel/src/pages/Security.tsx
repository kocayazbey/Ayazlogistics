import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';

const Security: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Güvenlik</h1>
        <p className="text-red-100">Güvenlik yönetimi ve izleme</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Güvenlik Skoru</p>
                <p className="text-2xl font-bold text-red-600">95%</p>
              </div>
              <Shield className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Security;
