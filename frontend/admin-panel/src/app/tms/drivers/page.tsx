'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const drivers = [
  {
    id: 'DR-001',
    name: 'John Smith',
    licenseNumber: 'DL123456789',
    licenseType: 'Commercial',
    status: 'active',
    phone: '+1 (555) 123-4567',
    email: 'john.smith@email.com',
    vehicle: 'VH-001',
    currentRoute: 'Route 101',
    location: 'Warehouse A',
    rating: 4.8,
    totalDeliveries: 245,
    hoursWorked: 40,
    startDate: '2022-01-15',
    lastDelivery: '2024-01-14',
    notes: 'Excellent driver with clean record',
  },
  {
    id: 'DR-002',
    name: 'Jane Doe',
    licenseNumber: 'DL987654321',
    licenseType: 'Commercial',
    status: 'on_duty',
    phone: '+1 (555) 234-5678',
    email: 'jane.doe@email.com',
    vehicle: 'VH-002',
    currentRoute: 'Route 102',
    location: 'En Route',
    rating: 4.6,
    totalDeliveries: 189,
    hoursWorked: 35,
    startDate: '2022-03-20',
    lastDelivery: '2024-01-15',
    notes: 'Reliable and punctual',
  },
  {
    id: 'DR-003',
    name: 'Mike Johnson',
    licenseNumber: 'DL456789123',
    licenseType: 'Commercial',
    status: 'off_duty',
    phone: '+1 (555) 345-6789',
    email: 'mike.johnson@email.com',
    vehicle: null,
    currentRoute: null,
    location: 'Home',
    rating: 4.9,
    totalDeliveries: 312,
    hoursWorked: 0,
    startDate: '2021-11-10',
    lastDelivery: '2024-01-13',
    notes: 'Senior driver with excellent performance',
  },
  {
    id: 'DR-004',
    name: 'Sarah Wilson',
    licenseNumber: 'DL789123456',
    licenseType: 'Commercial',
    status: 'on_break',
    phone: '+1 (555) 456-7890',
    email: 'sarah.wilson@email.com',
    vehicle: 'VH-003',
    currentRoute: 'Route 103',
    location: 'Rest Area',
    rating: 4.7,
    totalDeliveries: 156,
    hoursWorked: 25,
    startDate: '2023-02-01',
    lastDelivery: '2024-01-15',
    notes: 'New driver showing great potential',
  },
];

export default function TMSDriversPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        driver.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || driver.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'text-accent-600 bg-accent-100' },
      on_duty: { label: 'On Duty', color: 'text-primary-600 bg-primary-100' },
      off_duty: { label: 'Off Duty', color: 'text-secondary-600 bg-secondary-100' },
      on_break: { label: 'On Break', color: 'text-warning-600 bg-warning-100' },
      unavailable: { label: 'Unavailable', color: 'text-error-600 bg-error-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getRatingStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    
    return stars.join('');
  };

  return (
    <CorporateLayout
      title="Driver Management"
      subtitle="Manage driver assignments and performance tracking"
      breadcrumbs={[
        { label: 'TMS', href: '/tms' },
        { label: 'Drivers' }
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
            Add Driver
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
                    placeholder="Search by name, license number, or driver ID..."
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
                    <option value="on_duty">On Duty</option>
                    <option value="off_duty">Off Duty</option>
                    <option value="on_break">On Break</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Driver Summary */}
        <CorporateSection title="Driver Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{drivers.length}</p>
                  <p className="text-sm text-secondary-600">Total Drivers</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {drivers.filter(driver => driver.status === 'on_duty').length}
                  </p>
                  <p className="text-sm text-secondary-600">On Duty</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {drivers.filter(driver => driver.status === 'active').length}
                  </p>
                  <p className="text-sm text-secondary-600">Active</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {drivers.filter(driver => driver.status === 'on_break').length}
                  </p>
                  <p className="text-sm text-secondary-600">On Break</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Drivers Table */}
        <CorporateSection title="Driver Details">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Driver ID</TableHead>
                  <TableHead sortable>Name</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Current Route</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Deliveries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.id}</TableCell>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>
                      {getStatusBadge(driver.status)}
                    </TableCell>
                    <TableCell className="font-mono text-secondary-600">
                      {driver.licenseNumber}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {driver.vehicle || 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {driver.currentRoute || 'None'}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {driver.location}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-500 text-sm">
                          {getRatingStars(driver.rating)}
                        </span>
                        <span className="text-xs text-secondary-600 font-mono">
                          {driver.rating}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {formatNumber(driver.totalDeliveries)}
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