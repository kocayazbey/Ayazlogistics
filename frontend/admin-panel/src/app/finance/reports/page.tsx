'use client';

import React, { useState, useEffect } from 'react';
import { ChartBar, Search, Filter, Download, Calendar, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import { billingApi } from '../../../lib/api-comprehensive';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';

interface ReportItem {
  id: string;
  reportName: string;
  reportType: 'financial' | 'operational' | 'analytical' | 'compliance';
  period: string;
  status: 'generated' | 'generating' | 'failed';
  generatedDate: string;
  fileSize: string;
  format: 'pdf' | 'excel' | 'csv';
  description: string;
}

export default function FinanceReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const toast = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchReports();
  }, [searchTerm, filterType, filterStatus]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await billingApi.getFinancialReports({
        search: searchTerm || undefined,
        reportType: filterType !== 'all' ? filterType : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined
      });
      const reportsData = response.data?.items || response.data || response;
      
      const reportsList: ReportItem[] = Array.isArray(reportsData) 
        ? reportsData.map((report: any) => ({
            id: report.id,
            reportName: report.reportName || report.name || 'Unnamed Report',
            reportType: report.reportType || report.type || 'financial',
            period: report.period || report.dateRange || '',
            status: report.status || 'generated',
            generatedDate: report.generatedDate || report.createdAt || new Date().toISOString(),
            fileSize: report.fileSize || `${(report.size / 1024 / 1024).toFixed(1)} MB`,
            format: report.format || 'pdf',
            description: report.description || ''
          }))
        : [];
      
      setReports(reportsList);
    } catch (error) {
      console.error('Error fetching reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-blue-100 text-blue-800';
      case 'operational': return 'bg-green-100 text-green-800';
      case 'analytical': return 'bg-purple-100 text-purple-800';
      case 'compliance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'financial': return 'Financial';
      case 'operational': return 'Operational';
      case 'analytical': return 'Analytical';
      case 'compliance': return 'Compliance';
      default: return 'Unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-green-100 text-green-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'generated': return 'Generated';
      case 'generating': return 'Generating';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return '📄';
      case 'excel': return '📊';
      case 'csv': return '📋';
      default: return '📄';
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.reportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.period.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || report.reportType === filterType;
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = [
    { label: 'Total Reports', value: reports.length.toString() },
    { label: 'Generated', value: reports.filter(r => r.status === 'generated').length.toString() },
    { label: 'Generating', value: reports.filter(r => r.status === 'generating').length.toString() },
    { label: 'Failed', value: reports.filter(r => r.status === 'failed').length.toString() },
  ];

  const types = [...new Set(reports.map(report => report.reportType))];

  const quickReports = [
    { name: 'Daily Summary', type: 'financial', icon: DollarSign },
    { name: 'Weekly Analysis', type: 'analytical', icon: TrendingUp },
    { name: 'Monthly P&L', type: 'financial', icon: ChartBar },
    { name: 'Quarterly Review', type: 'operational', icon: TrendingDown },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Financial Reports</h1>
        <p className="text-gray-600">Generate and manage financial reports and analytics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const gradients = [
            'from-blue-500 to-cyan-500',
            'from-green-500 to-emerald-500',
            'from-yellow-500 to-orange-500',
            'from-red-500 to-pink-500'
          ];
          
          return (
            <div 
              key={stat.label} 
              className={`bg-gradient-to-br ${gradients[idx]} rounded-2xl p-6 text-white shadow-lg`}
            >
              <p className="text-sm opacity-90 mb-2">{stat.label}</p>
              <p className="text-3xl font-bold mb-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Reports */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickReports.map((report, idx) => {
            const gradients = [
              'from-blue-600 to-cyan-500',
              'from-green-600 to-emerald-500',
              'from-purple-600 to-pink-500',
              'from-orange-600 to-red-500'
            ];
            
            return (
              <button
                key={idx}
                className={`bg-gradient-to-br ${gradients[idx]} rounded-2xl p-6 text-white hover:scale-105 transform transition-all duration-300 shadow-lg`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <report.icon className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{report.name}</h3>
                    <p className="text-sm opacity-90">{getTypeText(report.type)} Report</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{getTypeText(type)}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="generated">Generated</option>
              <option value="generating">Generating</option>
              <option value="failed">Failed</option>
            </select>
            <button
              onClick={fetchReports}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Report Library</h3>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Report
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
              <ChartBar className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reports...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ChartBar className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{report.reportName}</div>
                          <div className="text-sm text-gray-500">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(report.reportType)}`}>
                        {getTypeText(report.reportType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {getStatusText(report.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{getFormatIcon(report.format)}</span>
                        <span className="text-sm text-gray-900 uppercase">{report.format}</span>
                        <span className="text-sm text-gray-500 ml-2">({report.fileSize})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(report.generatedDate).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {report.status === 'generated' && (
                          <button className="text-green-600 hover:text-green-900">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button className="text-blue-600 hover:text-blue-900">
                          <ChartBar className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
