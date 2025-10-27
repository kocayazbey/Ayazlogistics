import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileText, BarChart3, PieChart, Download } from 'lucide-react';

const Reports: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-amber-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Raporlar</h1>
        <p className="text-amber-100">Kapsamlı raporlama ve analiz</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Rapor</p>
                <p className="text-2xl font-bold text-amber-600">25</p>
              </div>
              <FileText className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
