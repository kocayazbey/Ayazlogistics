'use client';

import React, { useState } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';

// Mock data
const vehicles = [
  {
    id: 'VH-001',
    licensePlate: 'ABC-123',
    type: 'Truck',
    make: 'Ford',
    model: 'F-150',
    year: 2022,
    status: 'active',
    driver: 'John Smith',
    location: 'Warehouse A',
    fuelLevel: 85,
    mileage: 125000,
    lastMaintenance: '2024-01-10',
    nextMaintenance: '2024-02-10',
    capacity: '5000 kg',
    notes: 'Regular maintenance completed',
  },
  {
    id: 'VH-002',
    licensePlate: 'XYZ-456',
    type: 'Van',
    make: 'Mercedes',
    model: 'Sprinter',
    year: 2021,
    status: 'in_use',
    driver: 'Jane Doe',
    location: 'Route 101',
    fuelLevel: 45,
    mileage: 98000,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-02-05',
    capacity: '2000 kg',
    notes: 'Currently on delivery route',
  },
  {
    id: 'VH-003',
    licensePlate: 'DEF-789',
    type: 'Truck',
    make: 'Volvo',
    model: 'FH16',
    year: 2020,
    status: 'maintenance',
    driver: null,
    location: 'Service Center',
    fuelLevel: 20,
    mileage: 150000,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-01-20',
    capacity: '8000 kg',
    notes: 'Scheduled maintenance in progress',
  },
  {
    id: 'VH-004',
    licensePlate: 'GHI-012',
    type: 'Van',
    make: 'Ford',
    model: 'Transit',
    year: 2023,
    status: 'available',
    driver: null,
    location: 'Warehouse B',
    fuelLevel: 90,
    mileage: 25000,
    lastMaintenance: '2024-01-12',
    nextMaintenance: '2024-04-12',
    capacity: '1500 kg',
    notes: 'New vehicle - ready for assignment',
  },
];

export default function TMSVehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        vehicle.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || vehicle.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { label: 'Available', color: 'text-accent-600 bg-accent-100' },
      active: { label: 'Active', color: 'text-primary-600 bg-primary-100' },
      in_use: { label: 'In Use', color: 'text-blue-600 bg-blue-100' },
      maintenance: { label: 'Maintenance', color: 'text-warning-600 bg-warning-100' },
      out_of_service: { label: 'Out of Service', color: 'text-error-600 bg-error-100' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getFuelLevelColor = (level: number) => {
    if (level >= 70) return 'text-accent-600';
    if (level >= 30) return 'text-warning-600';
    return 'text-error-600';
  };

  return (
    <CorporateLayout
      title="Vehicle Management"
      subtitle="Manage fleet vehicles and maintenance schedules"
      breadcrumbs={[
        { label: 'TMS', href: '/tms' },
        { label: 'Vehicles' }
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
            Add Vehicle
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
                    placeholder="Search by license plate, make, model, or vehicle ID..."
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
                    <option value="available">Available</option>
                    <option value="active">Active</option>
                    <option value="in_use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Vehicle Summary */}
        <CorporateSection title="Fleet Summary">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{vehicles.length}</p>
                  <p className="text-sm text-secondary-600">Total Vehicles</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {vehicles.filter(vehicle => vehicle.status === 'available').length}
                  </p>
                  <p className="text-sm text-secondary-600">Available</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {vehicles.filter(vehicle => vehicle.status === 'in_use').length}
                  </p>
                  <p className="text-sm text-secondary-600">In Use</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {vehicles.filter(vehicle => vehicle.status === 'maintenance').length}
                  </p>
                  <p className="text-sm text-secondary-600">In Maintenance</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Vehicles Table */}
        <CorporateSection title="Fleet Details">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead sortable>Vehicle ID</TableHead>
                  <TableHead sortable>License Plate</TableHead>
                  <TableHead sortable>Type</TableHead>
                  <TableHead sortable>Make/Model</TableHead>
                  <TableHead sortable>Status</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Fuel Level</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.id}</TableCell>
                    <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
                    <TableCell>{vehicle.type}</TableCell>
                    <TableCell>{vehicle.make} {vehicle.model}</TableCell>
                    <TableCell>
                      {getStatusBadge(vehicle.status)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {vehicle.driver || 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {vehicle.location}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-secondary-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${vehicle.fuelLevel}%`,
                              backgroundColor: vehicle.fuelLevel >= 70 ? '#16a34a' : 
                                              vehicle.fuelLevel >= 30 ? '#f59e0b' : '#dc2626'
                            }}
                          />
                        </div>
                        <span className={`text-xs font-mono ${getFuelLevelColor(vehicle.fuelLevel)}`}>
                          {vehicle.fuelLevel}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {formatNumber(vehicle.mileage)} km
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