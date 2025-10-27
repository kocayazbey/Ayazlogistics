'use client';

import React, { useState, useEffect } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';
import { tmsApiClient } from '@/lib/api/tms.api';

interface Route {
  id: string;
  routeNumber: string;
  vehicleId: string;
  driverId: string;
  routeDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  totalDistance?: string;
  estimatedDuration?: number;
  totalStops?: number;
  optimizationAlgorithm?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TMSRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Mock tenant ID - in real app, get from auth context
  const tenantId = 'tenant-123';

  useEffect(() => {
    fetchRoutes();
  }, [pagination.page, filterStatus]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        tenantId,
        ...(filterStatus !== 'all' && { status: filterStatus })
      };

      const response = await tmsApiClient.routes.getAll(params);
      setRoutes(response.data.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.pages || 0
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routes');
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRoute = async (routeId: string) => {
    try {
      await tmsApiClient.routes.start(routeId);
      await fetchRoutes(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to start route');
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    try {
      await tmsApiClient.routes.complete(routeId);
      await fetchRoutes(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to complete route');
    }
  };

  const handleOptimizeRoute = async (routeId: string) => {
    try {
      await tmsApiClient.routes.optimize(routeId);
      await fetchRoutes(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to optimize route');
    }
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.routeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        route.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || route.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <CorporateLayout
        title="Route Management"
        subtitle="Manage transportation routes and deliveries"
        breadcrumbs={[
          { label: 'TMS', href: '/tms' },
          { label: 'Routes' }
        ]}
      >
        <CorporatePage>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-secondary-600">Loading routes...</p>
            </div>
          </div>
        </CorporatePage>
      </CorporateLayout>
    );
  }

  if (error) {
    return (
      <CorporateLayout
        title="Route Management"
        subtitle="Manage transportation routes and deliveries"
        breadcrumbs={[
          { label: 'TMS', href: '/tms' },
          { label: 'Routes' }
        ]}
      >
        <CorporatePage>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-error-600 text-lg font-medium mb-2">Error</div>
              <p className="text-secondary-600">{error}</p>
              <Button 
                onClick={fetchRoutes} 
                className="mt-4"
                variant="primary"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        </CorporatePage>
      </CorporateLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      planned: { label: 'Planned', color: 'text-warning-600 bg-warning-100' },
      in_progress: { label: 'In Progress', color: 'text-primary-600 bg-primary-100' },
      completed: { label: 'Completed', color: 'text-accent-600 bg-accent-100' },
      cancelled: { label: 'Cancelled', color: 'text-error-600 bg-error-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Low', color: 'text-secondary-600 bg-secondary-100' },
      medium: { label: 'Medium', color: 'text-warning-600 bg-warning-100' },
      high: { label: 'High', color: 'text-error-600 bg-error-100' },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  return (
    <CorporateLayout
      title="Route Management"
      subtitle="Manage transportation routes and deliveries"
      breadcrumbs={[
        { label: 'TMS', href: '/tms' },
        { label: 'Routes' }
      ]}
      actions={
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </Button>
          <Button variant="primary" size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Route
          </Button>
        </div>
      }
    >
      <CorporatePage>
        {/* Filters */}
        <CorporateSection>
          <Card>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by route name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    }
                  />
                </div>
                <div className="w-48">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block w-full px-3 py-2 border border-secondary-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Routes Summary */}
        <CorporateSection title="Routes Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{routes.length}</p>
                  <p className="text-sm text-secondary-600">Total Routes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {routes.filter(route => route.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-secondary-600">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {routes.filter(route => route.status === 'planned').length}
                  </p>
                  <p className="text-sm text-secondary-600">Planned</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {routes.filter(route => route.status === 'completed').length}
                  </p>
                  <p className="text-sm text-secondary-600">Completed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Routes Table */}
        <CorporateSection title="Route Details">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Route ID</TableHead>
                  <TableHead sortable>Route Number</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead>Driver ID</TableHead>
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Stops</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell className="font-medium">{route.id}</TableCell>
                    <TableCell className="font-medium">{route.routeNumber}</TableCell>
                    <TableCell>
                      {getStatusBadge(route.status)}
                    </TableCell>
                    <TableCell className="font-mono text-secondary-600">
                      {route.driverId}
                    </TableCell>
                    <TableCell className="font-mono text-secondary-600">
                      {route.vehicleId}
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {route.totalDistance ? `${route.totalDistance} km` : '-'}
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {route.totalStops || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-secondary-600">
                      {new Date(route.routeDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {route.status === 'planned' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleStartRoute(route.id)}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            Start
                          </Button>
                        )}
                        {route.status === 'in_progress' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCompleteRoute(route.id)}
                            className="text-accent-600 hover:text-accent-700"
                          >
                            Complete
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOptimizeRoute(route.id)}
                          className="text-warning-600 hover:text-warning-700"
                        >
                          Optimize
                        </Button>
                        <Button variant="ghost" size="sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </CorporateSection>
      </CorporatePage>
    </CorporateLayout>
  );
}