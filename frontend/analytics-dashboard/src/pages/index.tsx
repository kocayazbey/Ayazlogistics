import React from 'react';
import { Card } from '@ayazlogistics/design-system';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AnalyticsDashboard() {
  const revenueData = [
    { month: 'Jan', revenue: 2400000, cost: 1800000 },
    { month: 'Feb', revenue: 2600000, cost: 1900000 },
    { month: 'Mar', revenue: 2800000, cost: 2000000 },
    { month: 'Apr', revenue: 3100000, cost: 2100000 },
    { month: 'May', revenue: 2900000, cost: 1950000 },
    { month: 'Jun', revenue: 3400000, cost: 2200000 },
  ];

  const serviceDistribution = [
    { name: 'Storage', value: 40 },
    { name: 'Transport', value: 35 },
    { name: 'Handling', value: 15 },
    { name: 'Other', value: 10 },
  ];

  const COLORS = ['#007AFF', '#34C759', '#FF9500', '#5856D6'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KPICard label="Total Revenue" value="₺17.2M" trend="+12%" trendUp />
          <KPICard label="Active Customers" value="156" trend="+8" trendUp />
          <KPICard label="Avg Utilization" value="87%" trend="+3%" trendUp />
          <KPICard label="On-Time Delivery" value="96%" trend="-1%" trendUp={false} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card title="Revenue vs Cost">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2} />
                <Line type="monotone" dataKey="cost" stroke="#FF3B30" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Service Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, trend, trendUp }: any) {
  return (
    <Card>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        <p className={`mt-2 text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      </div>
    </Card>
  );
}

