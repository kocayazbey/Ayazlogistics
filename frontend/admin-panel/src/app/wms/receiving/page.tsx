'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const receivingOrders = [
  {
    id: 'RO-001',
    supplier: 'ABC Suppliers',
    status: 'in_progress',
    priority: 'high',
    expectedDate: '2024-01-15',
    actualDate: '2024-01-15',
    items: 25,
    receivedItems: 15,
    location: 'Dock A',
    assignedTo: 'John Smith',
    notes: 'Urgent delivery - handle with care',
  },
  {
    id: 'RO-002',
    supplier: 'XYZ Logistics',
    status: 'pending',
    priority: 'medium',
    expectedDate: '2024-01-16',
    actualDate: null,
    items: 18,
    receivedItems: 0,
    location: 'Dock B',
    assignedTo: 'Jane Doe',
    notes: 'Standard delivery',
  },
  {
    id: 'RO-003',
    supplier: 'Global Corp',
    status: 'completed',
    priority: 'low',
    expectedDate: '2024-01-14',
    actualDate: '2024-01-14',
    items: 30,
    receivedItems: 30,
    location: 'Dock C',
    assignedTo: 'Mike Johnson',
    notes: 'All items received and verified',
  },
  {
    id: 'RO-004',
    supplier: 'Tech Solutions',
    status: 'overdue',
    priority: 'high',
    expectedDate: '2024-01-12',
    actualDate: null,
    items: 12,
    receivedItems: 0,
    location: 'Dock A',
    assignedTo: 'Sarah Wilson',
    notes: 'Contact supplier for update',
  },
];

export default function WMSReceivingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredOrders = receivingOrders.filter(order => {
    const matchesSearch = order.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'text-warning-600 bg-warning-100' },
      in_progress: { label: 'In Progress', color: 'text-primary-600 bg-primary-100' },
      completed: { label: 'Completed', color: 'text-accent-600 bg-accent-100' },
      overdue: { label: 'Overdue', color: 'text-error-600 bg-error-100' },
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

  const getProgressPercentage = (received: number, total: number) => {
    return total > 0 ? Math.round((received / total) * 100) : 0;
  };

  return (
    <CorporateLayout
      title="Receiving Management"
      subtitle="Manage incoming shipments and receiving operations"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Receiving' }
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
            New Receiving Order
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
                    placeholder="Search by supplier or order ID..."
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
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Receiving Summary */}
        <CorporateSection title="Receiving Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{receivingOrders.length}</p>
                  <p className="text-sm text-secondary-600">Total Orders</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {receivingOrders.filter(order => order.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-secondary-600">In Progress</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {receivingOrders.filter(order => order.status === 'pending').length}
                  </p>
                  <p className="text-sm text-secondary-600">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-error-600">
                    {receivingOrders.filter(order => order.status === 'overdue').length}
                  </p>
                  <p className="text-sm text-secondary-600">Overdue</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Receiving Orders Table */}
        <CorporateSection title="Receiving Orders">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Order ID</TableHead>
                  <TableHead sortable>Supplier</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead sortable>Priority</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell className="font-medium">{order.supplier}</TableCell>
                    <TableCell>
                      {getStatusBadge(order.status)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(order.priority)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {order.expectedDate}
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {formatNumber(order.receivedItems)}/{formatNumber(order.items)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-secondary-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(order.receivedItems, order.items)}%` }}
                          />
                        </div>
                        <span className="text-xs text-secondary-600 font-mono">
                          {getProgressPercentage(order.receivedItems, order.items)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {order.location}
                    </TableCell>
                    <TableCell>{order.assignedTo}</TableCell>
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