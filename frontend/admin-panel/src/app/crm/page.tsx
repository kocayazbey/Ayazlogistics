'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, UserPlus, Phone, Mail, Calendar, TrendingUp } from 'lucide-react';

interface CRMStats {
  totalCustomers: number;
  newLeads: number;
  activeCampaigns: number;
  satisfactionRate: number;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  status: string;
  lastContact: string;
}

export default function CRMPage() {
  const [stats, setStats] = useState<CRMStats>({
    totalCustomers: 0,
    newLeads: 0,
    activeCampaigns: 0,
    satisfactionRate: 0
  });
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCRMData();
  }, []);

  const loadCRMData = async () => {
    try {
      setLoading(true);
      
      // Fetch CRM stats from API
      const statsResponse = await fetch('/api/crm/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent customers from API
      const customersResponse = await fetch('/api/crm/customers/recent');
      const customersData = await customersResponse.json();
      setRecentCustomers(customersData);
    } catch (error) {
      console.error('Error loading CRM data:', error);
      // Fallback to default values
      setStats({
        totalCustomers: 0,
        newLeads: 0,
        activeCampaigns: 0,
        satisfactionRate: 0
      });
      setRecentCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { title: 'Yeni Müşteri', icon: UserPlus, href: '/customers', color: 'from-blue-600 to-cyan-500' },
    { title: 'Potansiyel Müşteri', icon: Users, href: '/leads', color: 'from-green-600 to-emerald-500' },
    { title: 'İletişim', icon: Phone, href: '/contacts', color: 'from-purple-600 to-pink-500' },
    { title: 'Kampanya', icon: TrendingUp, href: '/campaigns', color: 'from-orange-600 to-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM - Müşteri İlişkileri Yönetimi</h1>
        <p className="text-gray-600">Müşteri ilişkilerinizi güçlendirin ve satışlarınızı artırın</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-gray-200 rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-8 bg-gray-300 rounded mb-1"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          ))
        ) : (
          [
            { label: 'Toplam Müşteri', value: stats.totalCustomers.toLocaleString(), change: '+12%' },
            { label: 'Yeni Potansiyel', value: stats.newLeads.toString(), change: '+23%' },
            { label: 'Aktif Kampanya', value: stats.activeCampaigns.toString(), change: '+2' },
            { label: 'Müşteri Memnuniyeti', value: `${stats.satisfactionRate}%`, change: '+3%' },
          ].map((stat, idx) => {
            const gradients = [
              'from-blue-500 to-cyan-500',
              'from-green-500 to-emerald-500',
              'from-purple-500 to-pink-500',
              'from-orange-500 to-red-500'
            ];
            
            return (
              <div 
                key={stat.label} 
                className={`bg-gradient-to-br ${gradients[idx]} rounded-2xl p-6 text-white shadow-lg`}
              >
                <p className="text-sm opacity-90 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm opacity-90">{stat.change}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">Hızlı erişim</p>
                </div>
                <action.icon className="h-8 w-8" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Customers & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Son Müşteriler</h3>
          <div className="space-y-4">
            {recentCustomers.map((customer, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    customer.status === 'Aktif' ? 'bg-green-500' :
                    customer.status === 'Potansiyel' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                    <p className="text-xs text-gray-500">{customer.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{customer.status}</p>
                  <p className="text-xs text-gray-500">{customer.lastContact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Satış Analizi</h3>
          <div className="space-y-4">
            {[
              { label: 'Bu Ay Satış', value: '₺2.4M', progress: 85, color: 'bg-blue-500' },
              { label: 'Hedef Gerçekleşme', value: '78%', progress: 78, color: 'bg-green-500' },
              { label: 'Yeni Müşteri', value: '23', progress: 92, color: 'bg-purple-500' },
              { label: 'Tekrar Satış', value: '67%', progress: 67, color: 'bg-orange-500' },
            ].map((metric, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">{metric.label}</span>
                  <span className="text-sm font-bold text-gray-900">{metric.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${metric.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${metric.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}