import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * React Query Configuration
 * API response caching, automatic refetching, optimistic updates
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 1,
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // Show toast notification
      },
    },
  },
});

/**
 * Query keys factory for type-safe cache management
 */
export const queryKeys = {
  // WMS
  warehouses: {
    all: ['warehouses'] as const,
    list: (filters?: any) => ['warehouses', 'list', filters] as const,
    detail: (id: string) => ['warehouses', 'detail', id] as const,
  },
  pallets: {
    all: ['pallets'] as const,
    list: (filters?: any) => ['pallets', 'list', filters] as const,
    detail: (id: string) => ['pallets', 'detail', id] as const,
    byLocation: (locationId: string) => ['pallets', 'byLocation', locationId] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (filters?: any) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    pending: () => ['orders', 'pending'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    bySku: (sku: string) => ['inventory', 'sku', sku] as const,
    byLocation: (locationId: string) => ['inventory', 'location', locationId] as const,
  },
  // Vehicles & Drivers
  vehicles: {
    all: ['vehicles'] as const,
    list: (filters?: any) => ['vehicles', 'list', filters] as const,
    detail: (id: string) => ['vehicles', 'detail', id] as const,
  },
  drivers: {
    all: ['drivers'] as const,
    list: (filters?: any) => ['drivers', 'list', filters] as const,
    detail: (id: string) => ['drivers', 'detail', id] as const,
  },
  carriers: {
    all: ['carriers'] as const,
    list: () => ['carriers', 'list'] as const,
    detail: (id: string) => ['carriers', 'detail', id] as const,
  },
  // ITS
  its: {
    all: ['its'] as const,
    serialNumbers: (filters?: any) => ['its', 'serials', filters] as const,
    aggregations: () => ['its', 'aggregations'] as const,
    tracking: (itsCode: string) => ['its', 'tracking', itsCode] as const,
  },
  // Parameters
  parameters: {
    all: ['parameters'] as const,
    byCategory: (category: string) => ['parameters', 'category', category] as const,
    detail: (key: string) => ['parameters', 'detail', key] as const,
  },
  // Reports
  reports: {
    receiving: (filters?: any) => ['reports', 'receiving', filters] as const,
    shipping: (filters?: any) => ['reports', 'shipping', filters] as const,
    performance: (type: string, filters?: any) => ['reports', 'performance', type, filters] as const,
    stock: (type: string, filters?: any) => ['reports', 'stock', type, filters] as const,
  },
  // Monitoring
  monitoring: {
    dashboard: () => ['monitoring', 'dashboard'] as const,
    alerts: () => ['monitoring', 'alerts'] as const,
    ptes: () => ['monitoring', 'ptes'] as const,
    pickingCarts: () => ['monitoring', 'pickingCarts'] as const,
  },
};

/**
 * Custom hooks for common queries
 */
export { queryClient, QueryClientProvider, ReactQueryDevtools };

