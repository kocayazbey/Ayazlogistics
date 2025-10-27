'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const trackingData = [
  {
    id: 'TR-001',
    orderNumber: 'ORD-001',
    customer: 'Acme Corporation',
    driver: 'John Smith',
    vehicle: 'VH-001',
    status: 'in_transit',
    currentLocation: 'Highway 101, Mile 45',
    destination: 'New York, NY',
    estimatedArrival: '2024-01-15 14:30',
    lastUpdate: '2024-01-15 12:15',
    progress: 65,
    distanceRemaining: '120 km',
    speed: '75 km/h',
    notes: 'On schedule - good weather conditions',
  },
  {
    id: 'TR-002',
    orderNumber: 'ORD-002',
    customer: 'Tech Solutions',
    driver: 'Jane Doe',
    vehicle: 'VH-002',
    status: 'delivered',
    currentLocation: 'Delivered',
    destination: 'Los Angeles, CA',
    estimatedArrival: '2024-01-15 10:00',
    lastUpdate: '2024-01-15 10:05',
    progress: 100,
    distanceRemaining: '0 km',
    speed: '0 km/h',
    notes: 'Successfully delivered - customer confirmed',
  },
  {
    id: 'TR-003',
    orderNumber: 'ORD-003',
    customer: 'Global Industries',
    driver: 'Mike Johnson',
    vehicle: 'VH-003',
    status: 'delayed',
    currentLocation: 'Traffic Jam - I-95',
    destination: 'Chicago, IL',
    estimatedArrival: '2024-01-15 16:45',
    lastUpdate: '2024-01-15 11:30',
    progress: 40,
    distanceRemaining: '180 km',
    speed: '25 km/h',
    notes: 'Heavy traffic - estimated 2 hour delay',
  },
  {
    id: 'TR-004',
    orderNumber: 'ORD-004',
    customer: 'Startup Inc',
    driver: 'Sarah Wilson',
    vehicle: 'VH-004',
    status: 'loading',
    currentLocation: 'Warehouse B',
    destination: 'Miami, FL',
    estimatedArrival: '2024-01-15 18:00',
    lastUpdate: '2024-01-15 09:45',
    progress: 15,
    distanceRemaining: '350 km',
    speed: '0 km/h',
    notes: 'Loading in progress - departure in 30 minutes',
  },
];

export default function TMSTrackingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredTracking = trackingData.filter(track => {
    const matchesSearch = track.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        track.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        track.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        track.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || track.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      loading: { label: 'Loading', color: 'text-warning-600 bg-warning-100' },
      in_transit: { label: 'In Transit', color: 'text-primary-600 bg-primary-100' },
      delivered: { label: 'Delivered', color: 'text-accent-600 bg-accent-100' },
      delayed: { label: 'Delayed', color: 'text-error-600 bg-error-100' },
      stopped: { label: 'Stopped', color: 'text-secondary-600 bg-secondary-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_transit;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-accent-600';
    if (progress >= 50) return 'bg-primary-600';
    if (progress >= 25) return 'bg-warning-600';
    return 'bg-error-600';
  };

  return (
    <CorporateLayout
      title="Tracking & Monitoring"
      subtitle="Real-time tracking of shipments and vehicles"
      breadcrumbs={[
        { label: 'TMS', href: '/tms' },
        { label: 'Tracking' }
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
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
                    placeholder="Search by customer, order number, driver, or tracking ID..."
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
                    <option value="loading">Loading</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="delayed">Delayed</option>
                    <option value="stopped">Stopped</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Tracking Summary */}
        <CorporateSection title="Tracking Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{trackingData.length}</p>
                  <p className="text-sm text-secondary-600">Total Shipments</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {trackingData.filter(track => track.status === 'in_transit').length}
                  </p>
                  <p className="text-sm text-secondary-600">In Transit</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {trackingData.filter(track => track.status === 'delivered').length}
                  </p>
                  <p className="text-sm text-secondary-600">Delivered</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-error-600">
                    {trackingData.filter(track => track.status === 'delayed').length}
                  </p>
                  <p className="text-sm text-secondary-600">Delayed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Tracking Table */}
        <CorporateSection title="Real-time Tracking">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Tracking ID</TableHead>
                  <TableHead sortable>Order Number</TableHead>
                  <TableHead sortable>Customer</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTracking.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell className="font-medium">{track.id}</TableCell>
                    <TableCell className="font-medium">{track.orderNumber}</TableCell>
                    <TableCell className="font-medium">{track.customer}</TableCell>
                    <TableCell>
                      {getStatusBadge(track.status)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {track.driver}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {track.vehicle}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {track.currentLocation}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-secondary-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(track.progress)}`}
                            style={{ width: `${track.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-secondary-600 font-mono">
                          {track.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {track.estimatedArrival}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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