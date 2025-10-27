'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const contracts = [
  {
    id: 'CT-001',
    customer: 'Acme Corporation',
    type: 'Service Agreement',
    status: 'active',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    value: 150000.00,
    monthlyRate: 12500.00,
    paymentTerms: 'Net 30',
    contactPerson: 'John Smith',
    phone: '+1 (555) 123-4567',
    email: 'john.smith@acme.com',
    renewalDate: '2024-11-01',
    notes: 'Annual logistics service contract',
  },
  {
    id: 'CT-002',
    customer: 'Tech Solutions Ltd',
    type: 'Transportation',
    status: 'pending',
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    value: 85000.00,
    monthlyRate: 7083.33,
    paymentTerms: 'Net 15',
    contactPerson: 'Jane Doe',
    phone: '+1 (555) 234-5678',
    email: 'jane.doe@techsolutions.com',
    renewalDate: '2024-12-01',
    notes: 'Transportation services contract - pending approval',
  },
  {
    id: 'CT-003',
    customer: 'Global Industries',
    type: 'Warehouse Management',
    status: 'expired',
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    value: 200000.00,
    monthlyRate: 16666.67,
    paymentTerms: 'Net 30',
    contactPerson: 'Mike Johnson',
    phone: '+1 (555) 345-6789',
    email: 'mike.johnson@global.com',
    renewalDate: '2023-11-01',
    notes: 'Expired contract - renewal under negotiation',
  },
  {
    id: 'CT-004',
    customer: 'Startup Inc',
    type: 'Full Service',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-06-14',
    value: 45000.00,
    monthlyRate: 9000.00,
    paymentTerms: 'Net 30',
    contactPerson: 'Sarah Wilson',
    phone: '+1 (555) 456-7890',
    email: 'sarah.wilson@startup.com',
    renewalDate: '2024-05-15',
    notes: 'Short-term contract for startup logistics needs',
  },
];

export default function BillingContractsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        contract.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        contract.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || contract.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'text-accent-600 bg-accent-100' },
      pending: { label: 'Pending', color: 'text-warning-600 bg-warning-100' },
      expired: { label: 'Expired', color: 'text-error-600 bg-error-100' },
      cancelled: { label: 'Cancelled', color: 'text-secondary-600 bg-secondary-100' },
      draft: { label: 'Draft', color: 'text-secondary-600 bg-secondary-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (endDate: string) => {
    const days = getDaysUntilExpiry(endDate);
    if (days < 0) return { status: 'expired', color: 'text-error-600' };
    if (days <= 30) return { status: 'expiring', color: 'text-warning-600' };
    return { status: 'active', color: 'text-accent-600' };
  };

  return (
    <CorporateLayout
      title="Contract Management"
      subtitle="Manage customer contracts and service agreements"
      breadcrumbs={[
        { label: 'Billing', href: '/billing' },
        { label: 'Contracts' }
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
            New Contract
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
                    placeholder="Search by customer, contract type, or contract ID..."
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
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Contract Summary */}
        <CorporateSection title="Contract Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{contracts.length}</p>
                  <p className="text-sm text-secondary-600">Total Contracts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {contracts.filter(contract => contract.status === 'active').length}
                  </p>
                  <p className="text-sm text-secondary-600">Active</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {contracts.filter(contract => contract.status === 'pending').length}
                  </p>
                  <p className="text-sm text-secondary-600">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-error-600">
                    {contracts.filter(contract => contract.status === 'expired').length}
                  </p>
                  <p className="text-sm text-secondary-600">Expired</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Contracts Table */}
        <CorporateSection title="Contract Details">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Contract ID</TableHead>
                  <TableHead sortable>Customer</TableHead>
                  <TableHead sortable>Type</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Monthly Rate</TableHead>
                  <TableHead>Expiry Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const expiryStatus = getExpiryStatus(contract.endDate);
                  const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                  
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.id}</TableCell>
                      <TableCell className="font-medium">{contract.customer}</TableCell>
                      <TableCell>{contract.type}</TableCell>
                      <TableCell>
                        {getStatusBadge(contract.status)}
                      </TableCell>
                      <TableCell className="text-secondary-600">
                        {contract.startDate}
                      </TableCell>
                      <TableCell className="text-secondary-600">
                        {contract.endDate}
                      </TableCell>
                      <TableCell numeric className="font-mono">
                        {formatCurrency(contract.value)}
                      </TableCell>
                      <TableCell numeric className="font-mono">
                        {formatCurrency(contract.monthlyRate)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${expiryStatus.color}`}>
                          {daysUntilExpiry < 0 ? 'Expired' : 
                           daysUntilExpiry <= 30 ? `Expires in ${daysUntilExpiry} days` : 
                           'Active'}
                        </span>
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
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </CorporateSection>
      </CorporatePage>
    </CorporateLayout>
  );
}