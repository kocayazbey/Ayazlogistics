import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { FileText, Folder, Download, Upload } from 'lucide-react';

const Documents: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-stone-600 to-stone-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Dokümanlar</h1>
        <p className="text-stone-100">Doküman yönetimi ve arşivleme</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Doküman</p>
                <p className="text-2xl font-bold text-stone-600">1,250</p>
              </div>
              <FileText className="h-8 w-8 text-stone-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Documents;
