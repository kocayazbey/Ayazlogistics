import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Scale, FileText, Shield, AlertCircle } from 'lucide-react';

const Legal: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-zinc-600 to-zinc-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Yasal</h1>
        <p className="text-zinc-100">Yasal uyumluluk ve düzenlemeler</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Yasal Uyumluluk</p>
                <p className="text-2xl font-bold text-zinc-600">100%</p>
              </div>
              <Scale className="h-8 w-8 text-zinc-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Legal;
