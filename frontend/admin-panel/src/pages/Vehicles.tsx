import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Truck, Car, MapPin, Wrench } from 'lucide-react';

const Vehicles: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Araçlar</h1>
        <p className="text-emerald-100">Filo yönetimi ve araç takibi</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Araç</p>
                <p className="text-2xl font-bold text-emerald-600">28</p>
              </div>
              <Truck className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Vehicles;
