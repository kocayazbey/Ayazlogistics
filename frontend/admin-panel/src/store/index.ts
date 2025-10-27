import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
    },
  ),
);

interface BillingMetrics {
  totalRevenue: number;
  outstandingInvoices: number;
  usageBasedBilling: number;
  accessorialCharges: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  totalAmount: string;
  paidAmount: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface BillingState {
  metrics: BillingMetrics | null;
  invoices: Invoice[];
  contracts: Contract[];
  selectedPeriod: string;
  isLoading: boolean;
  error: string | null;
  setMetrics: (metrics: BillingMetrics) => void;
  setInvoices: (invoices: Invoice[]) => void;
  setContracts: (contracts: Contract[]) => void;
  setSelectedPeriod: (period: string) => void;
  fetchInvoices: (filters?: any) => Promise<void>;
  fetchContracts: (filters?: any) => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  metrics: null,
  invoices: [],
  contracts: [],
  selectedPeriod: 'month',
  isLoading: false,
  error: null,
  
  setMetrics: (metrics) => set({ metrics }),
  setInvoices: (invoices) => set({ invoices }),
  setContracts: (contracts) => set({ contracts }),
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  
  fetchInvoices: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_URL}/api/v1/billing/invoices?${params.toString()}`);
      set({ invoices: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchContracts: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_URL}/api/v1/billing/contracts?${params.toString()}`);
      set({ contracts: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/billing/invoices/stats`);
      set({ 
        metrics: {
          totalRevenue: response.data.totalAmount,
          outstandingInvoices: response.data.outstandingAmount,
          usageBasedBilling: response.data.totalAmount * 0.6,
          accessorialCharges: response.data.totalAmount * 0.2,
        }
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));

interface Customer {
  id: string;
  customerNumber: string;
  companyName: string;
  email: string;
  phone: string;
  customerType: string;
  isActive: boolean;
}

interface Lead {
  id: string;
  leadNumber: string;
  companyName: string;
  contactName: string;
  status: string;
  leadScore: number;
  estimatedValue: string;
}

interface CRMState {
  customers: Customer[];
  leads: Lead[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  setCustomers: (customers: Customer[]) => void;
  setLeads: (leads: Lead[]) => void;
  setSelectedCustomer: (customer: Customer | null) => void;
  fetchCustomers: (filters?: any) => Promise<void>;
  fetchLeads: (filters?: any) => Promise<void>;
  convertLead: (leadId: string) => Promise<void>;
}

export const useCRMStore = create<CRMState>((set, get) => ({
  customers: [],
  leads: [],
  selectedCustomer: null,
  isLoading: false,
  error: null,
  
  setCustomers: (customers) => set({ customers }),
  setLeads: (leads) => set({ leads }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  
  fetchCustomers: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_URL}/api/v1/crm/customers?${params.toString()}`);
      set({ customers: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchLeads: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_URL}/api/v1/crm/leads?${params.toString()}`);
      set({ leads: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  convertLead: async (leadId: string) => {
    try {
      set({ isLoading: true, error: null });
      await axios.post(`${API_URL}/api/v1/crm/leads/${leadId}/convert`);
      await get().fetchLeads();
      await get().fetchCustomers();
      set({ isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));

interface Route {
  id: string;
  routeNumber: string;
  vehicleId: string;
  driverId: string;
  status: string;
  routeDate: string;
  totalDistance: string;
  totalStops: number;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  licensePlate: string;
  vehicleType: string;
  status: string;
}

interface Driver {
  id: string;
  driverNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
}

interface TMSState {
  routes: Route[];
  vehicles: Vehicle[];
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;
  fetchRoutes: (filters?: any) => Promise<void>;
  fetchVehicles: () => Promise<void>;
  fetchDrivers: (filters?: any) => Promise<void>;
}

export const useTMSStore = create<TMSState>((set) => ({
  routes: [],
  vehicles: [],
  drivers: [],
  isLoading: false,
  error: null,
  
  fetchRoutes: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_URL}/api/v1/tms/routes?${params.toString()}`);
      set({ routes: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchVehicles: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await axios.get(`${API_URL}/api/v1/tms/vehicles`);
      set({ vehicles: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  fetchDrivers: async (filters = {}) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams(filters);
      const response = await axios.get(`${API_URL}/api/v1/tms/drivers?${params.toString()}`);
      set({ drivers: response.data.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));

interface DashboardMetrics {
  financial: any;
  operations: any;
  customers: any;
  fleet: any;
}

interface AnalyticsState {
  dashboardMetrics: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  fetchDashboardMetrics: (startDate?: string, endDate?: string) => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  dashboardMetrics: null,
  isLoading: false,
  error: null,
  
  fetchDashboardMetrics: async (startDate?: string, endDate?: string) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await axios.get(`${API_URL}/api/v1/analytics/dashboard-metrics?${params.toString()}`);
      set({ dashboardMetrics: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
}));

