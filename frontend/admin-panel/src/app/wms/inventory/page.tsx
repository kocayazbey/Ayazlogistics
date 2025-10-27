'use client';

import React, { useState, useEffect } from 'react';
import { CorporateLayout, CorporatePage, CorporateSection } from '@/components/layout/CorporateLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';
import { wms } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/lib/hooks/useAuth';
import WMSPermissionGuard from '@/components/WMSPermissionGuard';
import { useWMSWebSocket } from '@/lib/websocket/useWMSWebSocket';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  unitPrice: number;
  location: string;
  status: string;
  lastUpdated: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<any>(null);

  // Real-time WebSocket connection
  const { isConnected, lastUpdate: wsLastUpdate } = useWMSWebSocket({
    warehouseId: user?.warehouseId,
    onInventoryAlert: (data) => {
      // Handle inventory alerts
      console.log('Inventory alert received:', data);
      // Refresh inventory data
      loadInventory();
    },
    onOperationUpdate: (data) => {
      // Handle operation updates that affect inventory
      console.log('Operation update received:', data);
      if (data.operationType === 'inventory') {
        loadInventory();
      }
    },
  });

  // Load inventory data
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const response = await wms.inventory.getAll({
          search: searchTerm,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          warehouseId: user?.warehouseId,
        });
        setInventoryItems(response.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load inventory');
        console.error('Inventory load error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadInventory();
    }
  }, [user, searchTerm, filterStatus]);

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_stock: { label: t('wms.inventory.status.inStock'), color: 'text-accent-600 bg-accent-100' },
      low_stock: { label: t('wms.inventory.status.lowStock'), color: 'text-warning-600 bg-warning-100' },
      out_of_stock: { label: t('wms.inventory.status.outOfStock'), color: 'text-error-600 bg-error-100' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_stock;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <WMSPermissionGuard
      requiredPermissions={['wms.inventory.view']}
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
        title={t('wms.inventory.title')}
        subtitle={t('wms.inventory.subtitle')}
        breadcrumbs={[
          { label: 'WMS', href: '/wms' },
          { label: t('wms.inventory.title') }
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
              {t('wms.inventory.addItem')}
            </Button>
          </div>
        }
      >
      <CorporatePage>
        {/* Filters */}
        <CorporateSection>
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-1">
                    <Input
                      placeholder={t('wms.inventory.search')}
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
                      <option value="all">{t('wms.common.all')}</option>
                      <option value="in_stock">{t('wms.inventory.status.inStock')}</option>
                      <option value="low_stock">{t('wms.inventory.status.lowStock')}</option>
                      <option value="out_of_stock">{t('wms.inventory.status.outOfStock')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-600">
                    {isConnected ? t('wms.common.online') : t('wms.common.offline')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </CorporateSection>

        {/* Inventory Table */}
        <CorporateSection title={t('wms.inventory.title')}>
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
                    <TableHead sortable>{t('wms.inventory.columns.sku')}</TableHead>
                    <TableHead sortable>{t('wms.inventory.columns.name')}</TableHead>
                    <TableHead>{t('wms.inventory.columns.description')}</TableHead>
                    <TableHead sortable numeric>{t('wms.inventory.columns.quantity')}</TableHead>
                    <TableHead sortable numeric>{t('wms.inventory.columns.unitPrice')}</TableHead>
                    <TableHead>{t('wms.inventory.columns.location')}</TableHead>
                    <TableHead sortable>{t('wms.inventory.columns.status')}</TableHead>
                    <TableHead>{t('wms.inventory.columns.lastUpdated')}</TableHead>
                    <TableHead>{t('wms.actions.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                    <TableCell numeric>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{formatNumber(item.quantity)}</span>
                        {item.quantity <= item.minQuantity && (
                          <span className="text-warning-500 text-xs">⚠️</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell numeric className="font-mono">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="font-mono text-secondary-600">
                      {item.location}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-secondary-600">
                      {item.lastUpdated}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" title={t('wms.actions.edit')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" title={t('wms.actions.view')}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

        {/* Summary Stats */}
        <CorporateSection title={t('wms.inventory.summary.totalItems')}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-secondary-900">{inventoryItems.length}</p>
                  <p className="text-sm text-secondary-600">{t('wms.inventory.summary.totalItems')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">
                    {inventoryItems.filter(item => item.status === 'in_stock').length}
                  </p>
                  <p className="text-sm text-secondary-600">{t('wms.inventory.summary.inStock')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-warning-600">
                    {inventoryItems.filter(item => item.status === 'low_stock').length}
                  </p>
                  <p className="text-sm text-secondary-600">{t('wms.inventory.summary.lowStock')}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl font-bold text-error-600">
                    {inventoryItems.filter(item => item.status === 'out_of_stock').length}
                  </p>
                  <p className="text-sm text-secondary-600">{t('wms.inventory.summary.outOfStock')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CorporateSection>
      </CorporatePage>
    </CorporateLayout>
  );
}