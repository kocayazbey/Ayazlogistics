'use client';

import React, { useMemo, useCallback } from 'react';
import { CreditCardIcon, ChartBarIcon, CurrencyDollarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface BillingMetric {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
}

interface Invoice {
  id: string;
  customer: string;
  amount: string;
  status: string;
  date: string;
}

const MetricCard = React.memo<{ metric: BillingMetric }>(({ metric }) => {
  const Icon = metric.icon;
  const trendColor = metric.trend === 'up' ? 'text-green-600' : 'text-red-600';
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-blue-50 rounded-xl">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <span className={`text-sm font-medium ${trendColor}`}>
          {metric.change}
        </span>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{metric.label}</h3>
      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
    </div>
  );
});

MetricCard.displayName = 'MetricCard';

const InvoiceRow = React.memo<{ invoice: Invoice }>(({ invoice }) => {
  const statusColor = useMemo(() => {
    switch (invoice.status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, [invoice.status]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {invoice.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {invoice.customer}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
        {invoice.amount}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {invoice.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        {invoice.date}
      </td>
    </tr>
  );
});

InvoiceRow.displayName = 'InvoiceRow';

export default function BillingDashboard() {
  const metrics: BillingMetric[] = useMemo(() => [
    {
      label: 'Total Revenue',
      value: '₺2,458,000',
      change: '+12.5%',
      trend: 'up',
      icon: CurrencyDollarIcon,
    },
    {
      label: 'Outstanding Invoices',
      value: '₺456,000',
      change: '-8.2%',
      trend: 'down',
      icon: DocumentTextIcon,
    },
    {
      label: 'Usage-Based Billing',
      value: '₺1,234,500',
      change: '+15.3%',
      trend: 'up',
      icon: ChartBarIcon,
    },
    {
      label: 'Accessorial Charges',
      value: '₺89,000',
      change: '+5.1%',
      trend: 'up',
      icon: CreditCardIcon,
    },
  ], []);

  const recentInvoices: Invoice[] = useMemo(() => [
    { id: 'INV-202410-000123', customer: 'ABC Logistics', amount: '₺45,600', status: 'paid', date: '2025-10-20' },
    { id: 'INV-202410-000122', customer: 'XYZ Transport', amount: '₺32,100', status: 'pending', date: '2025-10-19' },
    { id: 'INV-202410-000121', customer: 'Tech Solutions', amount: '₺78,900', status: 'paid', date: '2025-10-18' },
    { id: 'INV-202410-000120', customer: 'Global Cargo', amount: '₺21,500', status: 'overdue', date: '2025-10-15' },
    { id: 'INV-202410-000119', customer: 'Fast Delivery', amount: '₺54,300', status: 'paid', date: '2025-10-14' },
  ], []);

  const handleExport = useCallback(() => {
    console.log('Exporting invoices...');
  }, []);

  const handleFilter = useCallback((status: string) => {
    console.log('Filtering by:', status);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Revenue</h1>
          <p className="text-gray-600">Comprehensive billing management and revenue tracking</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Recent Invoices</h2>
              <p className="text-sm text-gray-600 mt-1">Latest billing transactions</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleFilter('all')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                All
              </button>
              <button
                onClick={() => handleFilter('pending')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Pending
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Export
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentInvoices.map((invoice) => (
                  <InvoiceRow key={invoice.id} invoice={invoice} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

