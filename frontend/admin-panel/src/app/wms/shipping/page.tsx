'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const shippingOrders = [
  {
    id: 'SO-001',
    orderNumber: 'ORD-001',
    customer: 'Acme Corporation',
    status: 'ready_to_ship',
    priority: 'high',
    carrier: 'FedEx',
    trackingNumber: 'FX123456789',
    destination: 'New York, NY',
    weight: 15.5,
    dimensions: '30x20x15 cm',
    estimatedDelivery: '2024-01-17',
    assignedTo: 'John Smith',
    notes: 'Handle with care - fragile items',
  },
  {
    id: 'SO-002',
    orderNumber: 'ORD-002',
    customer: 'Tech Solutions',
    status: 'in_transit',
    priority: 'medium',
    carrier: 'UPS',
    trackingNumber: 'UP987654321',
    destination: 'Los Angeles, CA',
    weight: 8.2,
    dimensions: '25x15x10 cm',
    estimatedDelivery: '2024-01-16',
    assignedTo: 'Jane Doe',
    notes: 'Standard shipping',
  },
  {
    id: 'SO-003',
    orderNumber: 'ORD-003',
    customer: 'Global Industries',
    status: 'delivered',
    priority: 'low',
    carrier: 'DHL',
    trackingNumber: 'DL456789123',
    destination: 'Chicago, IL',
    weight: 12.8,
    dimensions: '35x25x20 cm',
    estimatedDelivery: '2024-01-15',
    assignedTo: 'Mike Johnson',
    notes: 'Delivered successfully',
  },
  {
    id: 'SO-004',
    orderNumber: 'ORD-004',
    customer: 'Startup Inc',
    status: 'pending',
    priority: 'high',
    carrier: 'FedEx',
    trackingNumber: null,
    destination: 'Miami, FL',
    weight: 22.1,
    dimensions: '40x30x25 cm',
    estimatedDelivery: '2024-01-18',
    assignedTo: 'Sarah Wilson',
    notes: 'Awaiting carrier pickup',
  },
];

export default function WMSShippingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredOrders = shippingOrders.filter(order => {
    const matchesSearch = order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'text-warning-600 bg-warning-100' },
      ready_to_ship: { label: 'Ready to Ship', color: 'text-primary-600 bg-primary-100' },
      in_transit: { label: 'In Transit', color: 'text-blue-600 bg-blue-100' },
      delivered: { label: 'Delivered', color: 'text-accent-600 bg-accent-100' },
      delayed: { label: 'Delayed', color: 'text-error-600 bg-error-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
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

  return (
    <CorporateLayout
      title="Shipping Management"
      subtitle="Manage outgoing shipments and delivery tracking"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Shipping' }
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
            New Shipment
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
                    placeholder="Search by customer, order number, or shipping ID..."
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
                    <option value="pending">Pending</option>
                    <option value="ready_to_ship">Ready to Ship</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Shipping Summary */}
        <CorporateSection title="Shipping Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{shippingOrders.length}</p>
                  <p className="text-sm text-secondary-600">Total Shipments</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {shippingOrders.filter(order => order.status === 'in_transit').length}
                  </p>
                  <p className="text-sm text-secondary-600">In Transit</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {shippingOrders.filter(order => order.status === 'ready_to_ship').length}
                  </p>
                  <p className="text-sm text-secondary-600">Ready to Ship</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {shippingOrders.filter(order => order.status === 'delivered').length}
                  </p>
                  <p className="text-sm text-secondary-600">Delivered</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Shipping Orders Table */}
        <CorporateSection title="Shipping Orders">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Shipping ID</TableHead>
                  <TableHead sortable>Order Number</TableHead>
                  <TableHead sortable>Customer</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead sortable>Priority</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking Number</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="font-medium">{order.customer}</TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(order.priority)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {order.carrier}
                    </TableCell>
                    <TableCell className="font-mono text-secondary-600">
                      {order.trackingNumber || 'N/A'}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {order.destination}
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {order.weight} kg
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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