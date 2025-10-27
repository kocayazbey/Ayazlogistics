import { useState, useEffect, useCallback } from 'react';
import { driversApi, Driver, CreateDriverRequest, UpdateDriverRequest, GetDriversParams, DriverStats } from '../lib/api/drivers.api';

export interface UseDriversOptions {
  autoFetch?: boolean;
  initialParams?: GetDriversParams;
}

export interface UseDriversReturn {
  // Data
  drivers: Driver[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchDrivers: (params?: GetDriversParams) => Promise<void>;
  createDriver: (data: CreateDriverRequest) => Promise<Driver | null>;
  updateDriver: (id: string, data: UpdateDriverRequest) => Promise<Driver | null>;
  deleteDriver: (id: string) => Promise<boolean>;
  refreshDrivers: () => Promise<void>;

  // Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // State
  currentParams: GetDriversParams;
}

export function useDrivers(options: UseDriversOptions = {}): UseDriversReturn {
  const { autoFetch = true, initialParams = {} } = options;

  // State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialParams.page || 1);
  const [limit, setLimit] = useState(initialParams.limit || 10);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<GetDriversParams>(initialParams);

  // Fetch drivers
  const fetchDrivers = useCallback(async (params?: GetDriversParams) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = { ...currentParams, ...params };
      const response = await driversApi.getDrivers(queryParams);
      
      setDrivers(response.drivers);
      setTotal(response.total);
      setPage(response.page);
      setLimit(response.limit);
      setTotalPages(response.totalPages);
      setCurrentParams(queryParams);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch drivers');
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  }, [currentParams]);

  // Create driver
  const createDriver = useCallback(async (data: CreateDriverRequest): Promise<Driver | null> => {
    setLoading(true);
    setError(null);

    try {
      const newDriver = await driversApi.createDriver(data);
      await fetchDrivers(); // Refresh the list
      return newDriver;
    } catch (err: any) {
      setError(err.message || 'Failed to create driver');
      console.error('Error creating driver:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchDrivers]);

  // Update driver
  const updateDriver = useCallback(async (id: string, data: UpdateDriverRequest): Promise<Driver | null> => {
    setLoading(true);
    setError(null);

    try {
      const updatedDriver = await driversApi.updateDriver(id, data);
      
      // Update the driver in the local state
      setDrivers(prev => prev.map(driver => 
        driver.id === id ? updatedDriver : driver
      ));
      
      return updatedDriver;
    } catch (err: any) {
      setError(err.message || 'Failed to update driver');
      console.error('Error updating driver:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete driver
  const deleteDriver = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await driversApi.deleteDriver(id);
      
      // Remove the driver from local state
      setDrivers(prev => prev.filter(driver => driver.id !== id));
      setTotal(prev => prev - 1);
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete driver');
      console.error('Error deleting driver:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh drivers
  const refreshDrivers = useCallback(async () => {
    await fetchDrivers();
  }, [fetchDrivers]);

  // Pagination handlers
  const handleSetPage = useCallback((newPage: number) => {
    setPage(newPage);
    fetchDrivers({ ...currentParams, page: newPage });
  }, [currentParams, fetchDrivers]);

  const handleSetLimit = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page
    fetchDrivers({ ...currentParams, limit: newLimit, page: 1 });
  }, [currentParams, fetchDrivers]);

  const handleSetSearch = useCallback((search: string) => {
    setPage(1); // Reset to first page
    fetchDrivers({ ...currentParams, search, page: 1 });
  }, [currentParams, fetchDrivers]);

  const handleSetStatus = useCallback((status: string) => {
    setPage(1); // Reset to first page
    fetchDrivers({ ...currentParams, status, page: 1 });
  }, [currentParams, fetchDrivers]);

  const handleSetSortBy = useCallback((sortBy: string) => {
    fetchDrivers({ ...currentParams, sortBy });
  }, [currentParams, fetchDrivers]);

  const handleSetSortOrder = useCallback((sortOrder: 'asc' | 'desc') => {
    fetchDrivers({ ...currentParams, sortOrder });
  }, [currentParams, fetchDrivers]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchDrivers();
    }
  }, [autoFetch, fetchDrivers]);

  return {
    // Data
    drivers,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,

    // Actions
    fetchDrivers,
    createDriver,
    updateDriver,
    deleteDriver,
    refreshDrivers,

    // Pagination
    setPage: handleSetPage,
    setLimit: handleSetLimit,
    setSearch: handleSetSearch,
    setStatus: handleSetStatus,
    setSortBy: handleSetSortBy,
    setSortOrder: handleSetSortOrder,

    // State
    currentParams,
  };
}

// Hook for single driver
export function useDriver(id: string) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDriver = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const driverData = await driversApi.getDriverById(id);
      setDriver(driverData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch driver');
      console.error('Error fetching driver:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDriver();
  }, [fetchDriver]);

  return {
    driver,
    loading,
    error,
    refetch: fetchDriver,
  };
}

// Hook for driver stats
export function useDriverStats(id: string) {
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const statsData = await driversApi.getDriverStats(id);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch driver stats');
      console.error('Error fetching driver stats:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
