'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CurrencyDollar, DocumentText, ChartBar, TrendingUp, CreditCard, AlertCircle } from 'lucide-react';
import { financeApi } from '../../lib/api/finance.api';

export default function FinancePage() {
  const [stats, setStats] = useState([
    { label: 'Total Revenue', value: '₺0', change: '+0%' },
    { label: 'Outstanding Invoices', value: '₺0', change: '+0%' },
    { label: 'Monthly Expenses', value: '₺0', change: '+0%' },
    { label: 'Profit Margin', value: '0%', change: '+0%' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const [summaryResponse, outstandingResponse] = await Promise.all([
        financeApi.reports.getSummary().catch(() => ({ data: {} })),
        financeApi.reports.getOutstanding().catch(() => ({ data: [] }))
      ]);

      const summary = summaryResponse?.data || summaryResponse || {};
      const outstanding = outstandingResponse?.data || outstandingResponse || [];
      const outstandingTotal = outstanding.reduce((sum: number, inv: any) => sum + (inv.totals?.total || 0), 0);

      setStats([
        { label: 'Total Revenue', value: `₺${(summary.totalRevenue || 0).toLocaleString()}`, change: '+0%' },
        { label: 'Outstanding Invoices', value: `₺${outstandingTotal.toLocaleString()}`, change: '+0%' },
        { label: 'Monthly Expenses', value: `₺${(summary.totalExpenses || 0).toLocaleString()}`, change: '+0%' },
        { label: 'Profit Margin', value: `${summary.profitMargin || 0}%`, change: '+0%' },
      ]);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      title: 'Invoices', 
      description: 'Manage invoices and billing',
      icon: DocumentText, 
      href: '/finance/invoices', 
      color: 'from-blue-600 to-cyan-500' 
    },
    { 
      title: 'Accounts', 
      description: 'Financial accounts and transactions',
      icon: CreditCard, 
      href: '/finance/accounts', 
      color: 'from-green-600 to-emerald-500' 
    },
    { 
      title: 'Reports', 
      description: 'Financial reports and analytics',
      icon: ChartBar, 
      href: '/finance/reports', 
      color: 'from-purple-600 to-pink-500' 
    },
  ];

  const recentActivities = [
    { action: 'Invoice created', item: 'INV-2025-001 for ₺25,000', time: '5 minutes ago', type: 'invoice' },
    { action: 'Payment received', item: '₺15,000 from Customer A', time: '15 minutes ago', type: 'payment' },
    { action: 'Expense recorded', item: '₺2,500 for office supplies', time: '1 hour ago', type: 'expense' },
    { action: 'Invoice overdue', item: 'INV-2025-002 - ₺8,500', time: '2 hours ago', type: 'overdue' },
  ];

  const financialSummary = [
    { label: 'Cash Flow', value: '₺125K', trend: 'up', percentage: '+12%' },
    { label: 'Accounts Receivable', value: '₺320K', trend: 'down', percentage: '-5%' },
    { label: 'Accounts Payable', value: '₺180K', trend: 'up', percentage: '+8%' },
    { label: 'Net Worth', value: '₺1.8M', trend: 'up', percentage: '+18%' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Finance Management</h1>
        <p className="text-gray-600">Comprehensive financial management and reporting</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
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
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Finance Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <action.icon className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.type === 'invoice' ? 'bg-blue-500' :
                    activity.type === 'payment' ? 'bg-green-500' :
                    activity.type === 'expense' ? 'bg-purple-500' :
                    'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.item}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-4">
            {financialSummary.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    item.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.percentage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{item.value}</p>
                  <div className="flex items-center">
                    <TrendingUp className={`w-4 h-4 mr-1 ${
                      item.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className={`text-xs ${
                      item.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {item.trend === 'up' ? '↗' : '↘'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}