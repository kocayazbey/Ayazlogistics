import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Analitik</h1>
        <p className="text-teal-100">Kapsamlı analitik ve raporlama</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Görüntüleme</p>
                <p className="text-2xl font-bold text-teal-600">25,430</p>
              </div>
              <BarChart3 className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
