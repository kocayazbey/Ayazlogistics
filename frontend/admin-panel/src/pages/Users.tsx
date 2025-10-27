import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Users, UserPlus, Shield, Settings } from 'lucide-react';

const Users: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-rose-600 to-rose-800 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Kullanıcılar</h1>
        <p className="text-rose-100">Kullanıcı yönetimi ve yetkilendirme</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
                <p className="text-2xl font-bold text-rose-600">156</p>
              </div>
              <Users className="h-8 w-8 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Users;
