'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface DORAMetrics {
  id: string;
  period: string;
  deploymentFrequency: number;
  leadTimeForChanges: number;
  meanTimeToRecovery: number;
  changeFailureRate: number;
}

interface Deployment {
  id: string;
  environment: 'production' | 'staging' | 'development';
  strategy: 'canary' | 'blue_green' | 'rolling' | 'recreate';
  version: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startTime: string;
  endTime?: string;
  rollbackTime?: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed';
  startTime: string;
  endTime?: string;
  mttr?: number;
  rootCause?: string;
  resolution?: string;
}

interface DisasterRecovery {
  id: string;
  name: string;
  description: string;
  rpo: number;
  rto: number;
  lastTested?: string;
  status: 'active' | 'inactive' | 'testing';
}

export default function OperationalExcellencePage() {
  const [doraMetrics, setDoraMetrics] = useState<DORAMetrics[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [disasterRecovery, setDisasterRecovery] = useState<DisasterRecovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDoraModal, setShowDoraModal] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showDRModal, setShowDRModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch DORA metrics
      const doraResponse = await fetch('/api/v1/operations/excellence/dora-metrics');
      const doraData = await doraResponse.json();
      setDoraMetrics(doraData);

      // Fetch deployments
      const deploymentsResponse = await fetch('/api/v1/operations/excellence/deployments');
      const deploymentsData = await deploymentsResponse.json();
      setDeployments(deploymentsData);

      // Fetch incidents
      const incidentsResponse = await fetch('/api/v1/operations/excellence/incidents');
      const incidentsData = await incidentsResponse.json();
      setIncidents(incidentsData);

      // Fetch disaster recovery
      const drResponse = await fetch('/api/v1/operations/excellence/disaster-recovery');
      const drData = await drResponse.json();
      setDisasterRecovery(drData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      failed: 'error',
      rolled_back: 'error',
      open: 'error',
      investigating: 'warning',
      identified: 'info',
      monitoring: 'info',
      resolved: 'success',
      closed: 'default',
      active: 'success',
      inactive: 'default',
      testing: 'warning'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      P0: 'error',
      P1: 'error',
      P2: 'warning',
      P3: 'info'
    } as const;

    return <Badge variant={variants[severity as keyof typeof variants] || 'default'}>{severity}</Badge>;
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
        <h1 className="text-3xl font-bold text-gray-900">Operational Excellence</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowDoraModal(true)}>Record DORA</Button>
          <Button onClick={() => setShowDeploymentModal(true)}>Create Deployment</Button>
          <Button onClick={() => setShowIncidentModal(true)}>Create Incident</Button>
          <Button onClick={() => setShowDRModal(true)}>Add DR Plan</Button>
        </div>
      </div>

      {/* DORA Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Deployment Frequency</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doraMetrics.length > 0 ? doraMetrics[doraMetrics.length - 1]?.deploymentFrequency : 0}/day
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Lead Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doraMetrics.length > 0 ? doraMetrics[doraMetrics.length - 1]?.leadTimeForChanges : 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">MTTR</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doraMetrics.length > 0 ? doraMetrics[doraMetrics.length - 1]?.meanTimeToRecovery : 0}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Change Failure Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {doraMetrics.length > 0 ? doraMetrics[doraMetrics.length - 1]?.changeFailureRate : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deployments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Environment</th>
                <th>Strategy</th>
                <th>Version</th>
                <th>Status</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deployments.slice(0, 10).map((deployment) => (
                <tr key={deployment.id}>
                  <td className="font-medium capitalize">{deployment.environment}</td>
                  <td className="capitalize">{deployment.strategy.replace('_', ' ')}</td>
                  <td>{deployment.version}</td>
                  <td>{getStatusBadge(deployment.status)}</td>
                  <td>{new Date(deployment.startTime).toLocaleString()}</td>
                  <td>{deployment.endTime ? new Date(deployment.endTime).toLocaleString() : 'N/A'}</td>
                  <td>
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Active Incidents */}
      <Card>
        <CardHeader>
          <CardTitle>Active Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Start Time</th>
                <th>MTTR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.filter(incident => 
                ['open', 'investigating', 'identified', 'monitoring'].includes(incident.status)
              ).map((incident) => (
                <tr key={incident.id}>
                  <td className="font-medium">{incident.title}</td>
                  <td>{getSeverityBadge(incident.severity)}</td>
                  <td>{getStatusBadge(incident.status)}</td>
                  <td>{new Date(incident.startTime).toLocaleString()}</td>
                  <td>{incident.mttr ? `${incident.mttr}min` : 'N/A'}</td>
                  <td>
                    <Button variant="outline" size="sm">Update</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Disaster Recovery Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Disaster Recovery Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>RPO (min)</th>
                <th>RTO (min)</th>
                <th>Last Tested</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disasterRecovery.map((dr) => (
                <tr key={dr.id}>
                  <td className="font-medium">{dr.name}</td>
                  <td>{dr.rpo}</td>
                  <td>{dr.rto}</td>
                  <td>{dr.lastTested ? new Date(dr.lastTested).toLocaleDateString() : 'Never'}</td>
                  <td>{getStatusBadge(dr.status)}</td>
                  <td>
                    <Button variant="outline" size="sm">Test</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={showDoraModal} onClose={() => setShowDoraModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Record DORA Metrics</h2>
          <form className="space-y-4">
            <Input label="Period" placeholder="2025-01" />
            <Input label="Deployment Frequency" type="number" placeholder="2.5" />
            <Input label="Lead Time (hours)" type="number" placeholder="24.5" />
            <Input label="MTTR (hours)" type="number" placeholder="2.5" />
            <Input label="Change Failure Rate (%)" type="number" placeholder="5.0" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDoraModal(false)}>Cancel</Button>
              <Button>Record Metrics</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showDeploymentModal} onClose={() => setShowDeploymentModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Deployment</h2>
          <form className="space-y-4">
            <Select label="Environment" options={[
              { value: 'production', label: 'Production' },
              { value: 'staging', label: 'Staging' },
              { value: 'development', label: 'Development' }
            ]} />
            <Select label="Strategy" options={[
              { value: 'canary', label: 'Canary' },
              { value: 'blue_green', label: 'Blue-Green' },
              { value: 'rolling', label: 'Rolling' },
              { value: 'recreate', label: 'Recreate' }
            ]} />
            <Input label="Version" placeholder="v1.2.3" />
            <Input label="Start Time" type="datetime-local" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeploymentModal(false)}>Cancel</Button>
              <Button>Create Deployment</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showIncidentModal} onClose={() => setShowIncidentModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create Incident</h2>
          <form className="space-y-4">
            <Input label="Title" placeholder="Database connection timeout" />
            <Input label="Description" placeholder="Users experiencing slow response times" />
            <Select label="Severity" options={[
              { value: 'P0', label: 'P0 - Critical' },
              { value: 'P1', label: 'P1 - High' },
              { value: 'P2', label: 'P2 - Medium' },
              { value: 'P3', label: 'P3 - Low' }
            ]} />
            <Input label="Start Time" type="datetime-local" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowIncidentModal(false)}>Cancel</Button>
              <Button>Create Incident</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showDRModal} onClose={() => setShowDRModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Disaster Recovery Plan</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Primary Database DR" />
            <Input label="Description" placeholder="Disaster recovery plan for primary database" />
            <Input label="RPO (minutes)" type="number" placeholder="15" />
            <Input label="RTO (minutes)" type="number" placeholder="60" />
            <Input label="Last Tested" type="date" />
            <Select label="Status" options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'testing', label: 'Testing' }
            ]} />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDRModal(false)}>Cancel</Button>
              <Button>Add DR Plan</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}









