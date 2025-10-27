import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Webhook, Link, Zap, Settings } from 'lucide-react';

const Webhooks: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-600 to-slate-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Webhooks</h1>
        <p className="text-slate-100">Webhook yönetimi ve konfigürasyon</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktif Webhook</p>
                <p className="text-2xl font-bold text-slate-600">8</p>
              </div>
              <Webhook className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Webhooks;
