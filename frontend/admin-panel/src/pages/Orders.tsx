import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Package, ShoppingCart, Truck, CheckCircle } from 'lucide-react';

const Orders: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Sipariş Yönetimi</h1>
        <p className="text-cyan-100">Kapsamlı sipariş takip ve yönetimi</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Sipariş</p>
                <p className="text-2xl font-bold text-cyan-600">1,250</p>
              </div>
              <Package className="h-8 w-8 text-cyan-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Orders;
