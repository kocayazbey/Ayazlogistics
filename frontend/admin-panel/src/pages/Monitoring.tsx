import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Activity, Server, Database, AlertCircle } from 'lucide-react';

const Monitoring: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-lime-600 to-lime-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">İzleme</h1>
        <p className="text-lime-100">Sistem performansı ve izleme</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sistem Durumu</p>
                <p className="text-2xl font-bold text-lime-600">99.9%</p>
              </div>
              <Activity className="h-8 w-8 text-lime-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Monitoring;
