'use client';

import React, { useState, useEffect } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';
import { wms } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/useAuth';
import WMSPermissionGuard from '@/components/WMSPermissionGuard';

interface Operation {
  id: string;
  type: string;
  status: string;
  priority: string;
  assignedTo: string;
  startTime: string;
  estimatedCompletion: string;
  items: number;
  location: string;
}

export default function WMSOperationsPage() {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load operations data
  useEffect(() => {
    const loadOperations = async () => {
      try {
        setLoading(true);
        const response = await wms.operations.getAll({
          warehouseId: user?.warehouseId,
        });
        setOperations(response.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load operations');
        console.error('Operations load error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadOperations();
    }
  }, [user]);
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t('wms.operations.status.pending'), color: 'text-warning-600 bg-warning-100' },
      in_progress: { label: t('wms.operations.status.inProgress'), color: 'text-primary-600 bg-primary-100' },
      completed: { label: t('wms.operations.status.completed'), color: 'text-accent-600 bg-accent-100' },
      cancelled: { label: t('wms.operations.status.cancelled'), color: 'text-error-600 bg-error-100' },
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
      low: { label: t('wms.operations.priority.low'), color: 'text-secondary-600 bg-secondary-100' },
      medium: { label: t('wms.operations.priority.medium'), color: 'text-warning-600 bg-warning-100' },
      high: { label: t('wms.operations.priority.high'), color: 'text-error-600 bg-error-100' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <WMSPermissionGuard
      requiredPermissions={['wms.operations.view']}
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('wms.common.accessDenied')}</h3>
            <p className="text-sm text-gray-500">{t('wms.common.insufficientPermissions')}</p>
          </div>
        </div>
      }
    >
      <CorporateLayout
        title={t('wms.operations.title')}
        subtitle={t('wms.operations.subtitle')}
        breadcrumbs={[
          { label: 'WMS', href: '/wms' },
          { label: t('wms.operations.title') }
        ]}
        actions={
          <div className="flex items-center space-x-3">
            <Button variant="secondary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('wms.actions.export')}
            </Button>
            <Button variant="primary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('wms.operations.newOperation')}
            </Button>
          </div>
        }
      >
      <CorporatePage>
        {/* Operations Summary */}
        <CorporateSection title={t('wms.operations.summary.totalOperations')}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{operations.length}</p>
                  <p className="text-sm text-secondary-600">{t('wms.operations.summary.totalOperations')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {operations.filter(op => op.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-secondary-600">{t('wms.operations.summary.inProgress')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {operations.filter(op => op.status === 'pending').length}
                  </p>
                  <p className="text-sm text-secondary-600">{t('wms.operations.summary.pending')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {operations.filter(op => op.status === 'completed').length}
                  </p>
                  <p className="text-sm text-secondary-600">{t('wms.operations.summary.completed')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>

        {/* Operations Table */}
        <CorporateSection title={t('wms.operations.title')}>
          <Card>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                  <p className="text-sm text-secondary-600">{t('wms.common.loading')}</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <p className="text-sm text-error-600 mb-2">{t('wms.common.error')}</p>
                  <p className="text-xs text-secondary-600">{error}</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead sortable>{t('wms.operations.columns.operationId')}</TableHead>
                    <TableHead sortable>{t('wms.operations.columns.type')}</TableHead>
                    <TableHead sortable>{t('wms.operations.columns.status')}</TableHead>
                    <TableHead sortable>{t('wms.operations.columns.priority')}</TableHead>
                    <TableHead>{t('wms.operations.columns.assignedTo')}</TableHead>
                    <TableHead>{t('wms.operations.columns.startTime')}</TableHead>
                    <TableHead>{t('wms.operations.columns.items')}</TableHead>
                    <TableHead>{t('wms.operations.columns.location')}</TableHead>
                    <TableHead>{t('wms.actions.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {operations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="font-medium">{operation.id}</TableCell>
                    <TableCell>{operation.type}</TableCell>
                    <TableCell>
                      {getStatusBadge(operation.status)}
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(operation.priority)}
                    </TableCell>
                    <TableCell>{operation.assignedTo}</TableCell>
                    <TableCell className="text-secondary-600">
                      {operation.startTime}
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {formatNumber(operation.items)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {operation.location}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" title={t('wms.actions.view')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" title={t('wms.actions.edit')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" title={t('wms.actions.delete')}>
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