'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Badge } from '@/components/design-system/Badge';
import { Table } from '@/components/design-system/Table';
import { Modal } from '@/components/design-system/Modal';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

interface ComplianceFramework {
  id: string;
  name: string;
  type: 'ISO27001' | 'SOC2' | 'GDPR' | 'KVKK' | 'HIPAA';
  status: 'compliant' | 'partial' | 'non_compliant';
  lastAudit: string;
  nextAudit: string;
  score: number;
}

interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  title: string;
  description: string;
  status: 'met' | 'partial' | 'not_met';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

interface ComplianceAudit {
  id: string;
  frameworkId: string;
  auditor: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'failed';
  findings: number;
  score: number;
}

export default function CompliancePage() {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFrameworkModal, setShowFrameworkModal] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch compliance frameworks
      const frameworksResponse = await fetch('/api/v1/corporate/compliance/frameworks');
      const frameworksData = await frameworksResponse.json();
      setFrameworks(frameworksData);

      // Fetch compliance requirements
      const requirementsResponse = await fetch('/api/v1/corporate/compliance/requirements');
      const requirementsData = await requirementsResponse.json();
      setRequirements(requirementsData);

      // Fetch compliance audits
      const auditsResponse = await fetch('/api/v1/corporate/compliance/audits');
      const auditsData = await auditsResponse.json();
      setAudits(auditsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      compliant: 'success',
      partial: 'warning',
      non_compliant: 'error',
      met: 'success',
      not_met: 'error',
      scheduled: 'info',
      in_progress: 'warning',
      completed: 'success',
      failed: 'error'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'error',
      medium: 'warning',
      low: 'success'
    } as const;

    return <Badge variant={variants[priority as keyof typeof variants] || 'default'}>{priority}</Badge>;
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
        <h1 className="text-3xl font-bold text-gray-900">Compliance Management</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowFrameworkModal(true)}>Add Framework</Button>
          <Button onClick={() => setShowRequirementModal(true)}>Add Requirement</Button>
          <Button onClick={() => setShowAuditModal(true)}>Schedule Audit</Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Compliant Frameworks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {frameworks.filter(f => f.status === 'compliant').length}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Requirements Met</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requirements.filter(r => r.status === 'met').length}/{requirements.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Audits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {audits.filter(a => a.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {frameworks.length > 0 
                    ? Math.round(frameworks.reduce((sum, f) => sum + f.score, 0) / frameworks.length)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Frameworks */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Frameworks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Framework</th>
                <th>Type</th>
                <th>Status</th>
                <th>Score</th>
                <th>Last Audit</th>
                <th>Next Audit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((framework) => (
                <tr key={framework.id}>
                  <td className="font-medium">{framework.name}</td>
                  <td>{framework.type}</td>
                  <td>{getStatusBadge(framework.status)}</td>
                  <td>{framework.score}%</td>
                  <td>{new Date(framework.lastAudit).toLocaleDateString()}</td>
                  <td>{new Date(framework.nextAudit).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline" size="sm">View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Compliance Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((requirement) => (
                <tr key={requirement.id}>
                  <td className="font-medium">{requirement.title}</td>
                  <td>{getStatusBadge(requirement.status)}</td>
                  <td>{getPriorityBadge(requirement.priority)}</td>
                  <td>{new Date(requirement.dueDate).toLocaleDateString()}</td>
                  <td>
                    <Button variant="outline" size="sm">Update</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Compliance Audits */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <th>Auditor</th>
                <th>Framework</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Findings</th>
                <th>Score</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td className="font-medium">{audit.auditor}</td>
                  <td>{audit.frameworkId}</td>
                  <td>{new Date(audit.startDate).toLocaleDateString()}</td>
                  <td>{new Date(audit.endDate).toLocaleDateString()}</td>
                  <td>{getStatusBadge(audit.status)}</td>
                  <td>{audit.findings}</td>
                  <td>{audit.score}%</td>
                  <td>
                    <Button variant="outline" size="sm">View Report</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <Modal isOpen={showFrameworkModal} onClose={() => setShowFrameworkModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Compliance Framework</h2>
          <form className="space-y-4">
            <Input label="Name" placeholder="Framework Name" />
            <Select label="Type" options={[
              { value: 'ISO27001', label: 'ISO 27001' },
              { value: 'SOC2', label: 'SOC 2' },
              { value: 'GDPR', label: 'GDPR' },
              { value: 'KVKK', label: 'KVKK' },
              { value: 'HIPAA', label: 'HIPAA' }
            ]} />
            <Input label="Description" placeholder="Framework description" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowFrameworkModal(false)}>Cancel</Button>
              <Button>Add Framework</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showRequirementModal} onClose={() => setShowRequirementModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Compliance Requirement</h2>
          <form className="space-y-4">
            <Input label="Title" placeholder="Requirement Title" />
            <Input label="Description" placeholder="Requirement description" />
            <Select label="Priority" options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' }
            ]} />
            <Input label="Due Date" type="date" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRequirementModal(false)}>Cancel</Button>
              <Button>Add Requirement</Button>
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={showAuditModal} onClose={() => setShowAuditModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Schedule Compliance Audit</h2>
          <form className="space-y-4">
            <Input label="Auditor" placeholder="Auditor Name" />
            <Select label="Framework" options={frameworks.map(f => ({ value: f.id, label: f.name }))} />
            <Input label="Start Date" type="date" />
            <Input label="End Date" type="date" />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAuditModal(false)}>Cancel</Button>
              <Button>Schedule Audit</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
