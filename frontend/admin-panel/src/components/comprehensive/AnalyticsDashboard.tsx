import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Eye, 
  MousePointer,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  revenue: {
    total: number;
    growth: number;
    daily: Array<{ date: string; amount: number }>;
    bySource: Array<{ source: string; amount: number; percentage: number }>;
  };
  users: {
    total: number;
    active: number;
    new: number;
    growth: number;
    byDevice: Array<{ device: string; count: number; percentage: number }>;
    byLocation: Array<{ location: string; count: number; percentage: number }>;
  };
  conversions: {
    rate: number;
    total: number;
    growth: number;
    funnel: Array<{ step: string; count: number; percentage: number }>;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    uptime: number;
    cacheHitRate: number;
  };
  engagement: {
    timeOnSite: number;
    pagesPerSession: number;
    bounceRate: number;
    returnRate: number;
  };
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    revenue: {
      total: 125000,
      growth: 12.5,
      daily: [
        { date: '2024-01-01', amount: 12000 },
        { date: '2024-01-02', amount: 15000 },
        { date: '2024-01-03', amount: 18000 },
        { date: '2024-01-04', amount: 14000 },
        { date: '2024-01-05', amount: 16000 },
        { date: '2024-01-06', amount: 19000 },
        { date: '2024-01-07', amount: 17000 }
      ],
      bySource: [
        { source: 'Direct', amount: 45000, percentage: 36 },
        { source: 'Organic Search', amount: 35000, percentage: 28 },
        { source: 'Social Media', amount: 25000, percentage: 20 },
        { source: 'Email', amount: 15000, percentage: 12 },
        { source: 'Referral', amount: 5000, percentage: 4 }
      ]
    },
    users: {
      total: 1240,
      active: 890,
      new: 45,
      growth: 8.2,
      byDevice: [
        { device: 'Desktop', count: 620, percentage: 50 },
        { device: 'Mobile', count: 496, percentage: 40 },
        { device: 'Tablet', count: 124, percentage: 10 }
      ],
      byLocation: [
        { location: 'United States', count: 496, percentage: 40 },
        { location: 'United Kingdom', count: 186, percentage: 15 },
        { location: 'Canada', count: 124, percentage: 10 },
        { location: 'Germany', count: 99, percentage: 8 },
        { location: 'Other', count: 335, percentage: 27 }
      ]
    },
    conversions: {
      rate: 3.2,
      total: 89,
      growth: 15.3,
      funnel: [
        { step: 'Visitors', count: 2781, percentage: 100 },
        { step: 'Product Views', count: 1390, percentage: 50 },
        { step: 'Add to Cart', count: 278, percentage: 10 },
        { step: 'Checkout', count: 139, percentage: 5 },
        { step: 'Purchase', count: 89, percentage: 3.2 }
      ]
    },
    performance: {
      responseTime: 245,
      throughput: 1200,
      errorRate: 1.2,
      uptime: 99.9,
      cacheHitRate: 87.5
    },
    engagement: {
      timeOnSite: 4.2,
      pagesPerSession: 3.8,
      bounceRate: 32.5,
      returnRate: 45.2
    }
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: 'Last 7 Days',
    value: '7d',
    days: 7
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'conversions' | 'performance'>('overview');

  const timeRanges: TimeRange[] = [
    { label: 'Last 24 Hours', value: '1d', days: 1 },
    { label: 'Last 7 Days', value: '7d', days: 7 },
    { label: 'Last 30 Days', value: '30d', days: 30 },
    { label: 'Last 90 Days', value: '90d', days: 90 }
  ];

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'Desktop': return <Monitor className="w-4 h-4" />;
      case 'Mobile': return <Smartphone className="w-4 h-4" />;
      case 'Tablet': return <Tablet className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analitik Dashboard</h1>
        <p className="text-gray-600">Kapsamlı iş ve teknik analitik</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = timeRanges.find(r => r.value === e.target.value);
                if (range) setSelectedTimeRange(range);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeRanges.map((range) => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Yenile</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
              <Download className="w-4 h-4" />
              <span>Dışa Aktar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
          {[
            { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
            { id: 'revenue', label: 'Gelir', icon: DollarSign },
            { id: 'users', label: 'Kullanıcılar', icon: Users },
            { id: 'conversions', label: 'Dönüşümler', icon: ShoppingCart },
            { id: 'performance', label: 'Performans', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-gray-900">Revenue</h3>
                </div>
                {getGrowthIcon(analyticsData.revenue.growth)}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">${analyticsData.revenue.total.toLocaleString()}</div>
              <p className={`text-sm ${getGrowthColor(analyticsData.revenue.growth)}`}>
                +{analyticsData.revenue.growth}% from last period
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Active Users</h3>
                </div>
                {getGrowthIcon(analyticsData.users.growth)}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.users.active.toLocaleString()}</div>
              <p className={`text-sm ${getGrowthColor(analyticsData.users.growth)}`}>
                +{analyticsData.users.growth}% from last period
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-gray-900">Conversions</h3>
                </div>
                {getGrowthIcon(analyticsData.conversions.growth)}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.conversions.total}</div>
              <p className={`text-sm ${getGrowthColor(analyticsData.conversions.growth)}`}>
                +{analyticsData.conversions.growth}% from last period
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  <h3 className="font-semibold text-gray-900">Conversion Rate</h3>
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.conversions.rate}%</div>
              <p className="text-sm text-gray-600">Industry average: 2.5%</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue by Source</h3>
              <div className="space-y-4">
                {analyticsData.revenue.bySource.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">{source.source}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">${source.amount.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">({source.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Users by Device</h3>
              <div className="space-y-4">
                {analyticsData.users.byDevice.map((device, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(device.device)}
                      <span className="text-sm text-gray-600">{device.device}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{device.count}</span>
                      <span className="text-xs text-gray-500">({device.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Daily Revenue</h3>
              <div className="space-y-3">
                {analyticsData.revenue.daily.map((day, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">${day.amount.toLocaleString()}</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(day.amount / 20000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Revenue Sources</h3>
              <div className="space-y-4">
                {analyticsData.revenue.bySource.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-blue-500' :
                        index === 1 ? 'bg-green-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' : 'bg-gray-500'
                      }`}></div>
                      <span className="text-sm text-gray-600">{source.source}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">${source.amount.toLocaleString()}</span>
                      <span className="text-xs text-gray-500">({source.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Total Users</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.users.total.toLocaleString()}</div>
              <p className="text-sm text-gray-600">+{analyticsData.users.new} new today</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Active Users</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.users.active.toLocaleString()}</div>
              <p className="text-sm text-gray-600">{Math.round((analyticsData.users.active / analyticsData.users.total) * 100)}% of total</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Growth Rate</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">+{analyticsData.users.growth}%</div>
              <p className="text-sm text-gray-600">From last period</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Users by Device</h3>
              <div className="space-y-4">
                {analyticsData.users.byDevice.map((device, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getDeviceIcon(device.device)}
                      <span className="text-sm text-gray-600">{device.device}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{device.count}</span>
                      <span className="text-xs text-gray-500">({device.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Users by Location</h3>
              <div className="space-y-4">
                {analyticsData.users.byLocation.map((location, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{location.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{location.count}</span>
                      <span className="text-xs text-gray-500">({location.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversions Tab */}
      {activeTab === 'conversions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Conversion Rate</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.conversions.rate}%</div>
              <p className="text-sm text-gray-600">Industry average: 2.5%</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Total Conversions</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.conversions.total}</div>
              <p className="text-sm text-gray-600">+{analyticsData.conversions.growth}% from last period</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Funnel Performance</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">Good</div>
              <p className="text-sm text-gray-600">Above industry standards</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-4">
              {analyticsData.conversions.funnel.map((step, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-yellow-500' :
                      index === 3 ? 'bg-orange-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">{step.step}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-900">{step.count.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">({step.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-900">Response Time</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.performance.responseTime}ms</div>
              <p className="text-sm text-gray-600">Target: &lt;300ms</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-gray-900">Throughput</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.performance.throughput} req/s</div>
              <p className="text-sm text-gray-600">Peak capacity</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Eye className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-gray-900">Error Rate</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.performance.errorRate}%</div>
              <p className="text-sm text-gray-600">Target: &lt;1%</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">Uptime</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{analyticsData.performance.uptime}%</div>
              <p className="text-sm text-gray-600">Last 30 days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Time on Site</span>
                  <span className="font-semibold text-gray-900">{analyticsData.engagement.timeOnSite} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pages per Session</span>
                  <span className="font-semibold text-gray-900">{analyticsData.engagement.pagesPerSession}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Bounce Rate</span>
                  <span className="font-semibold text-gray-900">{analyticsData.engagement.bounceRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Return Rate</span>
                  <span className="font-semibold text-gray-900">{analyticsData.engagement.returnRate}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Technical Performance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cache Hit Rate</span>
                  <span className="font-semibold text-gray-900">{analyticsData.performance.cacheHitRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="font-semibold text-gray-900">{analyticsData.performance.responseTime}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Throughput</span>
                  <span className="font-semibold text-gray-900">{analyticsData.performance.throughput} req/s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="font-semibold text-gray-900">{analyticsData.performance.errorRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
