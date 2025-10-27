import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  User, 
  Clock, 
  Globe, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar,
  Activity,
  Lock,
  Database,
  Server,
  Zap
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  userId: string;
  userName: string;
  tenantId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  status: 'success' | 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  changes?: {
    before: any;
    after: any;
  };
  source: string;
  sessionId: string;
}

interface AuditFilters {
  action: string;
  resource: string;
  userId: string;
  status: string;
  severity: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  ip: string;
}

const AuditTrail: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      action: 'LOGIN',
      resource: 'authentication',
      userId: 'user123',
      userName: 'John Doe',
      tenantId: 'tenant1',
      timestamp: new Date(),
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      severity: 'low',
      details: 'Successful login from Chrome browser',
      source: 'Web Application',
      sessionId: 'sess_123456'
    },
    {
      id: '2',
      action: 'CREATE',
      resource: 'order',
      userId: 'user456',
      userName: 'Jane Smith',
      tenantId: 'tenant1',
      timestamp: new Date(Date.now() - 300000),
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      status: 'success',
      severity: 'medium',
      details: 'Order created successfully',
      changes: {
        before: null,
        after: { orderId: 'ORD-123', amount: 150.00, status: 'pending' }
      },
      source: 'API',
      sessionId: 'sess_789012'
    },
    {
      id: '3',
      action: 'UPDATE',
      resource: 'inventory',
      userId: 'user789',
      userName: 'Bob Johnson',
      tenantId: 'tenant1',
      timestamp: new Date(Date.now() - 600000),
      ip: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      status: 'warning',
      severity: 'high',
      details: 'Inventory updated with low stock alert',
      changes: {
        before: { quantity: 50, status: 'normal' },
        after: { quantity: 5, status: 'low_stock' }
      },
      source: 'Admin Panel',
      sessionId: 'sess_345678'
    },
    {
      id: '4',
      action: 'DELETE',
      resource: 'user',
      userId: 'admin001',
      userName: 'Admin User',
      tenantId: 'tenant1',
      timestamp: new Date(Date.now() - 900000),
      ip: '192.168.1.103',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      severity: 'critical',
      details: 'User account deleted',
      changes: {
        before: { userId: 'user999', status: 'active' },
        after: { userId: 'user999', status: 'deleted' }
      },
      source: 'Admin Panel',
      sessionId: 'sess_901234'
    },
    {
      id: '5',
      action: 'FAILED_LOGIN',
      resource: 'authentication',
      userId: 'unknown',
      userName: 'Unknown User',
      tenantId: 'tenant1',
      timestamp: new Date(Date.now() - 1200000),
      ip: '203.0.113.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'error',
      severity: 'high',
      details: 'Multiple failed login attempts from suspicious IP',
      source: 'Security System',
      sessionId: 'sess_567890'
    }
  ]);

  const [filters, setFilters] = useState<AuditFilters>({
    action: '',
    resource: '',
    userId: '',
    status: '',
    severity: '',
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    ip: ''
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Activity className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return <Lock className="w-4 h-4 text-blue-500" />;
      case 'CREATE': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'UPDATE': return <Activity className="w-4 h-4 text-yellow-500" />;
      case 'DELETE': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'FAILED_LOGIN': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'authentication': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'order': return <Database className="w-4 h-4 text-green-500" />;
      case 'inventory': return <Server className="w-4 h-4 text-purple-500" />;
      case 'user': return <User className="w-4 h-4 text-orange-500" />;
      default: return <Database className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
    if (filters.resource && !log.resource.toLowerCase().includes(filters.resource.toLowerCase())) return false;
    if (filters.userId && !log.userId.toLowerCase().includes(filters.userId.toLowerCase())) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.severity && log.severity !== filters.severity) return false;
    if (filters.ip && !log.ip.includes(filters.ip)) return false;
    if (searchTerm && !log.details.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (log.timestamp < filters.dateRange.start || log.timestamp > filters.dateRange.end) return false;
    return true;
  });

  const exportLogs = () => {
    const csvContent = [
      ['ID', 'Action', 'Resource', 'User', 'Timestamp', 'IP', 'Status', 'Severity', 'Details'].join(','),
      ...filteredLogs.map(log => [
        log.id,
        log.action,
        log.resource,
        log.userName,
        log.timestamp.toISOString(),
        log.ip,
        log.status,
        log.severity,
        `"${log.details}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Trail</h1>
            <p className="text-gray-600">Comprehensive audit logging and monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={exportLogs}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Filter Audit Logs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <input
                type="text"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder="e.g., LOGIN, CREATE"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resource</label>
              <input
                type="text"
                value={filters.resource}
                onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
                placeholder="e.g., authentication, order"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                placeholder="e.g., user123"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IP Address</label>
              <input
                type="text"
                value={filters.ip}
                onChange={(e) => setFilters({ ...filters, ip: e.target.value })}
                placeholder="e.g., 192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange, start: new Date(e.target.value) }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    dateRange: { ...filters.dateRange, end: new Date(e.target.value) }
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit logs..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Audit Logs ({filteredLogs.length})</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Last 7 days</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-medium text-gray-900">{log.action}</span>
                      <span className="text-sm text-gray-500">on</span>
                      <span className="text-sm text-gray-600">{log.resource}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                        {log.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mb-2">{log.details}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{log.userName} ({log.userId})</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>{log.ip}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{log.timestamp.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Database className="w-3 h-3" />
                        <span>{log.source}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(log.status)}
                  <span className="text-sm text-gray-500 capitalize">{log.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <p className="text-sm text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                  <p className="text-sm text-gray-900">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                  <p className="text-sm text-gray-900">{selectedLog.userName} ({selectedLog.userId})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedLog.status}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedLog.severity}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <p className="text-sm text-gray-900">{selectedLog.ip}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timestamp</label>
                  <p className="text-sm text-gray-900">{selectedLog.timestamp.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <p className="text-sm text-gray-900">{selectedLog.source}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <p className="text-sm text-gray-900">{selectedLog.details}</p>
              </div>
              {selectedLog.changes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Changes</label>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Before</h4>
                        <pre className="text-xs text-gray-600 bg-white p-2 rounded border">
                          {JSON.stringify(selectedLog.changes.before, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">After</h4>
                        <pre className="text-xs text-gray-600 bg-white p-2 rounded border">
                          {JSON.stringify(selectedLog.changes.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
