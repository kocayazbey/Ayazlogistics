'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const payments = [
  {
    id: 'PAY-001',
    invoiceNumber: 'INV-001',
    customer: 'Acme Corporation',
    amount: 12500.00,
    status: 'completed',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN123456789',
    paymentDate: '2024-01-15',
    dueDate: '2024-01-15',
    processedBy: 'System',
    reference: 'REF-001',
    notes: 'Payment received on time',
  },
  {
    id: 'PAY-002',
    invoiceNumber: 'INV-002',
    customer: 'Tech Solutions Ltd',
    amount: 8500.50,
    status: 'pending',
    paymentMethod: 'Credit Card',
    transactionId: null,
    paymentDate: null,
    dueDate: '2024-01-20',
    processedBy: null,
    reference: 'REF-002',
    notes: 'Payment processing in progress',
  },
  {
    id: 'PAY-003',
    invoiceNumber: 'INV-003',
    customer: 'Global Industries',
    amount: 16666.67,
    status: 'failed',
    paymentMethod: 'Bank Transfer',
    transactionId: 'TXN987654321',
    paymentDate: '2024-01-10',
    dueDate: '2024-01-10',
    processedBy: 'System',
    reference: 'REF-003',
    notes: 'Payment failed - insufficient funds',
  },
  {
    id: 'PAY-004',
    invoiceNumber: 'INV-004',
    customer: 'Startup Inc',
    amount: 9000.00,
    status: 'processing',
    paymentMethod: 'ACH Transfer',
    transactionId: 'TXN456789123',
    paymentDate: '2024-01-14',
    dueDate: '2024-01-15',
    processedBy: 'System',
    reference: 'REF-004',
    notes: 'ACH transfer in progress',
  },
];

export default function BillingPaymentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || payment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: 'Completed', color: 'text-accent-600 bg-accent-100' },
      pending: { label: 'Pending', color: 'text-warning-600 bg-warning-100' },
      processing: { label: 'Processing', color: 'text-primary-600 bg-primary-100' },
      failed: { label: 'Failed', color: 'text-error-600 bg-error-100' },
      cancelled: { label: 'Cancelled', color: 'text-secondary-600 bg-secondary-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTotalAmount = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getCompletedAmount = () => {
    return payments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getPendingAmount = () => {
    return payments
      .filter(payment => payment.status === 'pending')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getFailedAmount = () => {
    return payments
      .filter(payment => payment.status === 'failed')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  return (
    <CorporateLayout
      title="Payment Management"
      subtitle="Track and manage customer payments"
      breadcrumbs={[
        { label: 'Billing', href: '/billing' },
        { label: 'Payments' }
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
            Record Payment
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
                    placeholder="Search by customer, invoice number, or payment ID..."
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
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Payment Summary */}
        <CorporateSection title="Payment Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{formatCurrency(getTotalAmount())}</p>
                  <p className="text-sm text-secondary-600">Total Amount</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">{formatCurrency(getCompletedAmount())}</p>
                  <p className="text-sm text-secondary-600">Completed</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">{formatCurrency(getPendingAmount())}</p>
                  <p className="text-sm text-secondary-600">Pending</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-error-600">{formatCurrency(getFailedAmount())}</p>
                  <p className="text-sm text-secondary-600">Failed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Payments Table */}
        <CorporateSection title="Payment Details">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Payment ID</TableHead>
                  <TableHead sortable>Invoice Number</TableHead>
                  <TableHead sortable>Customer</TableHead>
                  <TableHead sortable>Amount</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.id}</TableCell>
                    <TableCell className="font-medium">{payment.invoiceNumber}</TableCell>
                    <TableCell className="font-medium">{payment.customer}</TableCell>
                    <TableCell numeric className="font-mono">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {payment.paymentMethod}
                    </TableCell>
                    <TableCell className="font-mono text-secondary-600">
                      {payment.transactionId || 'N/A'}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {payment.paymentDate || 'N/A'}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {payment.dueDate}
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
