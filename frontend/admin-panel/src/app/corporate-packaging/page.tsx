'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface SLA {
  id: string;
  name: string;
  description: string;
  target: number;
  actual: number;
  status: 'met' | 'at_risk' | 'breached';
  createdAt: string;
}

interface SupportPlan {
  id: string;
  name: string;
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  features: string[];
  price: number;
  isActive: boolean;
}

interface MaintenanceWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'scheduled' | 'emergency' | 'planned';
  status: 'upcoming' | 'in_progress' | 'completed';
  description: string;
}

export default function CorporatePackagingPage() {
  const [slas, setSlas] = useState<SLA[]>([]);
  const [supportPlans, setSupportPlans] = useState<SupportPlan[]>([]);
  const [maintenanceWindows, setMaintenanceWindows] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [showSupportPlanModal, setShowSupportPlanModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch SLA data
      const slaResponse = await fetch('/api/v1/corporate/sla');
      const slaData = await slaResponse.json();
      setSlas(slaData);

      // Fetch support plans
      const supportResponse = await fetch('/api/v1/corporate/sla/support-plans');
      const supportData = await supportResponse.json();
      setSupportPlans(supportData);

      // Fetch maintenance windows
      const maintenanceResponse = await fetch('/api/v1/corporate/sla/maintenance-windows');
      const maintenanceData = await maintenanceResponse.json();
      setMaintenanceWindows(maintenanceData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      met: 'success',
      at_risk: 'warning',
      breached: 'error',
      upcoming: 'info',
      in_progress: 'warning',
      completed: 'success'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Corporate Packaging</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowSlaModal(true)}>Create SLA</Button>
          <Button onClick={() => setShowSupportPlanModal(true)}>Create Support Plan</Button>
          <Button onClick={() => setShowMaintenanceModal(true)}>Schedule Maintenance</Button>
        </div>
      </div>

      {/* SLA Overview */}
      <Card>
        <CardHeader>
          <CardTitle>SLA Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Target</th>
                <th>Actual</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slas.map((sla) => (
                <tr key={sla.id}>
                  <td className="font-medium">{sla.name}</td>
                  <td>{sla.target}%</td>
                  <td>{sla.actual}%</td>
                  <td>{getStatusBadge(sla.status)}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Support Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Support Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportPlans.map((plan) => (
              <Card key={plan.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <Badge variant={plan.isActive ? 'success' : 'default'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-blue-600">${plan.price}/month</p>
                <p className="text-sm text-gray-600 capitalize">{plan.tier}</p>
                <ul className="mt-2 text-sm">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Windows */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Windows</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceWindows.map((window) => (
                <tr key={window.id}>
                  <td className="font-medium">{window.name}</td>
                  <td className="capitalize">{window.type}</td>
                  <td>{new Date(window.startTime).toLocaleString()}</td>
                  <td>{new Date(window.endTime).toLocaleString()}</td>
                  <td>{getStatusBadge(window.status)}</td>
                  <td>
                    <Button variant="outline" size="sm">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={showSlaModal} onClose={() => setShowSlaModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create SLA</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="SLA Name" />
            <Input label="Description" placeholder="SLA Description" />
            <Input label="Target (%)" type="number" placeholder="99.9" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSlaModal(false)}>Cancel</Button>
              <Button>Create SLA</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showSupportPlanModal} onClose={() => setShowSupportPlanModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Support Plan</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Support Plan Name" />
            <Select label="Tier" options={[
              { value: 'basic', label: 'Basic' },
              { value: 'standard', label: 'Standard' },
              { value: 'premium', label: 'Premium' },
              { value: 'enterprise', label: 'Enterprise' }
            ]} />
            <Input label="Price" type="number" placeholder="99" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSupportPlanModal(false)}>Cancel</Button>
              <Button>Create Plan</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showMaintenanceModal} onClose={() => setShowMaintenanceModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Schedule Maintenance</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Maintenance Name" />
            <Select label="Type" options={[
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'emergency', label: 'Emergency' },
              { value: 'planned', label: 'Planned' }
            ]} />
            <Input label="Start Time" type="datetime-local" />
            <Input label="End Time" type="datetime-local" />
            <Input label="Description" placeholder="Maintenance description" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowMaintenanceModal(false)}>Cancel</Button>
              <Button>Schedule</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
