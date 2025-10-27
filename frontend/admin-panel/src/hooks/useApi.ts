import { useState, useEffect } from 'react';
import { wmsApi, tmsApi, crmApi, erpApi, billingApi, analyticsApi } from '../services/api';

// Generic hook for API calls
export const useApi = <T>(
  apiCall: () => Promise<{ data: T }>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiCall();
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: () => fetchData() };
};

// WMS Hooks
export const useWarehouses = (filters?: any) => {
  return useApi(() => wmsApi.warehouses.getAll(filters), [filters]);
};

export const useWarehouse = (id: string) => {
  return useApi(() => wmsApi.warehouses.getById(id), [id]);
};

export const useWarehouseMetrics = (id: string) => {
  return useApi(() => wmsApi.warehouses.getMetrics(id), [id]);
};

export const useReceivingOrders = (filters?: any) => {
  return useApi(() => wmsApi.receiving.getAll(filters), [filters]);
};

export const usePickingOrders = (filters?: any) => {
  return useApi(() => wmsApi.picking.getAll(filters), [filters]);
};

export const usePackingOrders = (filters?: any) => {
  return useApi(() => wmsApi.packing.getAll(filters), [filters]);
};

export const useShipments = (filters?: any) => {
  return useApi(() => wmsApi.shipping.getAll(filters), [filters]);
};

// TMS Hooks
export const useRoutes = (filters?: any) => {
  return useApi(() => tmsApi.routes.getAll(filters), [filters]);
};

export const useRoute = (id: string) => {
  return useApi(() => tmsApi.routes.getById(id), [id]);
};

export const useRouteMetrics = () => {
  return useApi(() => tmsApi.routes.getMetrics());
};

export const useVehicles = (filters?: any) => {
  return useApi(() => tmsApi.vehicles.getAll(filters), [filters]);
};

export const useVehicle = (id: string) => {
  return useApi(() => tmsApi.vehicles.getById(id), [id]);
};

export const useVehicleMetrics = () => {
  return useApi(() => tmsApi.vehicles.getMetrics());
};

export const useDrivers = (filters?: any) => {
  return useApi(() => tmsApi.drivers.getAll(filters), [filters]);
};

export const useDriver = (id: string) => {
  return useApi(() => tmsApi.drivers.getById(id), [id]);
};

export const useDriverMetrics = () => {
  return useApi(() => tmsApi.drivers.getMetrics());
};

export const useGpsTracking = (filters?: any) => {
  return useApi(() => tmsApi.gpsTracking.getAll(filters), [filters]);
};

export const useLoadBoard = (filters?: any) => {
  return useApi(() => tmsApi.loadBoard.getAll(filters), [filters]);
};

export const useLoadBoardMetrics = () => {
  return useApi(() => tmsApi.loadBoard.getMetrics());
};

// CRM Hooks
export const useCustomers = (filters?: any) => {
  return useApi(() => crmApi.customers.getAll(filters), [filters]);
};

export const useCustomer = (id: string) => {
  return useApi(() => crmApi.customers.getById(id), [id]);
};

export const useCustomerMetrics = () => {
  return useApi(() => crmApi.customers.getMetrics());
};

export const useCustomerSegments = () => {
  return useApi(() => crmApi.customers.getSegments());
};

export const useLeads = (filters?: any) => {
  return useApi(() => crmApi.leads.getAll(filters), [filters]);
};

export const useLead = (id: string) => {
  return useApi(() => crmApi.leads.getById(id), [id]);
};

export const useLeadMetrics = () => {
  return useApi(() => crmApi.leads.getMetrics());
};

export const useLeadPipeline = () => {
  return useApi(() => crmApi.leads.getPipeline());
};

export const useActivities = (filters?: any) => {
  return useApi(() => crmApi.activities.getAll(filters), [filters]);
};

export const useActivity = (id: string) => {
  return useApi(() => crmApi.activities.getById(id), [id]);
};

export const useActivityMetrics = () => {
  return useApi(() => crmApi.activities.getMetrics());
};

export const useUpcomingActivities = (days?: number) => {
  return useApi(() => crmApi.activities.getUpcoming(days), [days]);
};

export const useOverdueActivities = () => {
  return useApi(() => crmApi.activities.getOverdue());
};

// ERP Hooks
export const useFinance = (filters?: any) => {
  return useApi(() => erpApi.finance.getAll(filters), [filters]);
};

export const useFinanceMetrics = () => {
  return useApi(() => erpApi.finance.getMetrics());
};

export const useCashFlow = (dateRange?: any) => {
  return useApi(() => erpApi.finance.getCashFlow(dateRange), [dateRange]);
};

export const useEmployees = (filters?: any) => {
  return useApi(() => erpApi.hr.employees.getAll(filters), [filters]);
};

export const useEmployee = (id: string) => {
  return useApi(() => erpApi.hr.employees.getById(id), [id]);
};

export const useEmployeeMetrics = () => {
  return useApi(() => erpApi.hr.employees.getMetrics());
};

export const useInventory = (filters?: any) => {
  return useApi(() => erpApi.inventory.getAll(filters), [filters]);
};

export const useInventoryMetrics = () => {
  return useApi(() => erpApi.inventory.getMetrics());
};

export const useLowStockItems = () => {
  return useApi(() => erpApi.inventory.getLowStockItems());
};

export const useInventoryValue = () => {
  return useApi(() => erpApi.inventory.getInventoryValue());
};

export const usePurchaseOrders = (filters?: any) => {
  return useApi(() => erpApi.purchasing.getAll(filters), [filters]);
};

export const usePurchaseOrder = (id: string) => {
  return useApi(() => erpApi.purchasing.getById(id), [id]);
};

export const usePurchasingMetrics = () => {
  return useApi(() => erpApi.purchasing.getMetrics());
};

// Billing Hooks
export const useInvoices = (filters?: any) => {
  return useApi(() => billingApi.invoices.getAll(filters), [filters]);
};

export const useInvoice = (id: string) => {
  return useApi(() => billingApi.invoices.getById(id), [id]);
};

export const useInvoiceMetrics = () => {
  return useApi(() => billingApi.invoices.getMetrics());
};

export const useRevenueMetrics = () => {
  return useApi(() => billingApi.invoices.getRevenueMetrics());
};

export const useOverdueInvoices = () => {
  return useApi(() => billingApi.invoices.getOverdueInvoices());
};

export const useContracts = (filters?: any) => {
  return useApi(() => billingApi.contracts.getAll(filters), [filters]);
};

export const useContract = (id: string) => {
  return useApi(() => billingApi.contracts.getById(id), [id]);
};

export const useContractMetrics = () => {
  return useApi(() => billingApi.contracts.getMetrics());
};

export const useExpiringContracts = (days?: number) => {
  return useApi(() => billingApi.contracts.getExpiringContracts(days), [days]);
};

export const usePayments = (filters?: any) => {
  return useApi(() => billingApi.payments.getAll(filters), [filters]);
};

export const usePayment = (id: string) => {
  return useApi(() => billingApi.payments.getById(id), [id]);
};

export const usePaymentMetrics = () => {
  return useApi(() => billingApi.payments.getMetrics());
};

export const usePaymentMethods = () => {
  return useApi(() => billingApi.payments.getPaymentMethods());
};

export const usePaymentTrends = (dateRange?: any) => {
  return useApi(() => billingApi.payments.getPaymentTrends(dateRange), [dateRange]);
};

// Analytics Hooks
export const useAnalyticsOverview = () => {
  return useApi(() => analyticsApi.dashboard.getOverview());
};

export const useAnalyticsMetrics = (category?: string) => {
  return useApi(() => analyticsApi.dashboard.getMetrics(category), [category]);
};

export const useAnalyticsKPIs = () => {
  return useApi(() => analyticsApi.dashboard.getKPIs());
};

export const useAnalyticsAlerts = () => {
  return useApi(() => analyticsApi.dashboard.getAlerts());
};

export const useAnalyticsReports = (filters?: any) => {
  return useApi(() => analyticsApi.reports.getAll(filters), [filters]);
};

export const useAnalyticsReport = (id: string) => {
  return useApi(() => analyticsApi.reports.getById(id), [id]);
};

export const useAnalyticsReportMetrics = () => {
  return useApi(() => analyticsApi.reports.getMetrics());
};

export const useAnalyticsReportMetrics = () => {
  return useApi(() => analyticsApi.metrics.getAll());
};

export const useAnalyticsMetric = (id: string) => {
  return useApi(() => analyticsApi.metrics.getById(id), [id]);
};

export const useAnalyticsMetricTrends = (id: string, dateRange?: any) => {
  return useApi(() => analyticsApi.metrics.getTrends(id, dateRange), [id, dateRange]);
};

export const useAnalyticsMetricComparison = (id: string, compareWith?: string) => {
  return useApi(() => analyticsApi.metrics.getComparison(id, compareWith), [id, compareWith]);
};
