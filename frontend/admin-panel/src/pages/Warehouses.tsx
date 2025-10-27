import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Warehouse, MapPin, Package, Settings } from 'lucide-react';

const Warehouses: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Depolar</h1>
        <p className="text-violet-100">Depo yönetimi ve konum takibi</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Depo</p>
                <p className="text-2xl font-bold text-violet-600">8</p>
              </div>
              <Warehouse className="h-8 w-8 text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Warehouses;
