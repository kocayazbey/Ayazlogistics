import { apiClient } from '../api-client';

export interface Driver {
  id: string;
  driverNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'available' | 'busy' | 'offline' | 'maintenance';
  rating?: number;
  totalRoutes?: number;
  completedRoutes?: number;
  totalDistance?: number;
  totalHours?: number;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDriverRequest {
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseType: string;
  experience: string;
  rating: number;
  location: string;
  notes?: string;
}

export interface UpdateDriverRequest extends Partial<CreateDriverRequest> {}

export interface GetDriversParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DriverStats {
  driverId: string;
  totalRoutes: number;
  completedRoutes: number;
  averageRating: number;
  totalDistance: number;
  totalHours: number;
}

export interface VehicleAssignment {
  driverId: string;
  vehicleId: string;
  assignedAt: string;
  assignedBy: string;
}

export const driversApi = {
  // Get all drivers with pagination and filtering
  getDrivers: (params?: GetDriversParams) => 
    apiClient.get<{
      drivers: Driver[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/api/v1/tms/drivers', params),

  // Get driver by ID
  getDriverById: (id: string) => 
    apiClient.get<Driver>(`/api/v1/tms/drivers/${id}`),

  // Get driver statistics
  getDriverStats: (id: string) => 
    apiClient.get<DriverStats>(`/api/v1/tms/drivers/${id}/stats`),

  // Create new driver
  createDriver: (data: CreateDriverRequest) => 
    apiClient.post<Driver>('/api/v1/tms/drivers', data),

  // Update driver
  updateDriver: (id: string, data: UpdateDriverRequest) => 
    apiClient.put<Driver>(`/api/v1/tms/drivers/${id}`, data),

  // Delete driver
  deleteDriver: (id: string) => 
    apiClient.delete<{ success: boolean; deletedId: string }>(`/api/v1/tms/drivers/${id}`),

  // Assign vehicle to driver
  assignVehicle: (id: string, data: { vehicleId: string; assignmentDate?: string }) => 
    apiClient.post<VehicleAssignment>(`/api/v1/tms/drivers/${id}/assign-vehicle`, data),

  // Unassign vehicle from driver
  unassignVehicle: (id: string) => 
    apiClient.post<{ success: boolean; driverId: string; unassignedAt: string; unassignedBy: string }>(`/api/v1/tms/drivers/${id}/unassign-vehicle`),

  // Get driver performance metrics
  getDriverPerformance: (id: string, params?: { startDate?: string; endDate?: string }) => 
    apiClient.get<{
      driverId: string;
      period: { startDate: string; endDate: string };
      metrics: {
        totalRoutes: number;
        completedRoutes: number;
        onTimeDeliveries: number;
        averageRating: number;
        safetyScore: number;
        fuelEfficiency: number;
      };
      trends: {
        routeCompletionRate: number;
        ratingTrend: 'up' | 'down' | 'stable';
        safetyTrend: 'up' | 'down' | 'stable';
      };
    }>(`/api/v1/tms/drivers/${id}/performance`, params),

  // Record safety event
  recordSafetyEvent: (data: {
    driverId: string;
    eventType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location?: string;
    timestamp: string;
    metadata?: any;
  }) => 
    apiClient.post<{
      success: boolean;
      eventId: string;
      recordedAt: string;
    }>('/api/v1/tms/drivers/safety-event', data),

  // Get driver routes
  getDriverRoutes: (id: string, params?: { status?: string; startDate?: string; endDate?: string }) => 
    apiClient.get<{
      driverId: string;
      routes: Array<{
        id: string;
        routeNumber: string;
        status: string;
        startLocation: string;
        endLocation: string;
        totalDistance: number;
        estimatedDuration: number;
        actualDuration?: number;
        createdAt: string;
        completedAt?: string;
      }>;
      total: number;
    }>(`/api/v1/tms/drivers/${id}/routes`, params),

  // Update driver status
  updateDriverStatus: (id: string, status: 'available' | 'busy' | 'offline' | 'maintenance') => 
    apiClient.patch<Driver>(`/api/v1/tms/drivers/${id}/status`, { status }),

  // Get available drivers
  getAvailableDrivers: (params?: { location?: string; vehicleType?: string }) => 
    apiClient.get<Driver[]>('/api/v1/tms/drivers/available', params),

  // Bulk operations
  bulkUpdateStatus: (driverIds: string[], status: 'available' | 'busy' | 'offline' | 'maintenance') => 
    apiClient.patch<{ success: boolean; updatedCount: number }>('/api/v1/tms/drivers/bulk/status', {
      driverIds,
      status
    }),

  // Export drivers data
  exportDrivers: (params?: { format?: 'csv' | 'excel' | 'pdf'; filters?: any }) => 
    apiClient.get<Blob>('/api/v1/tms/drivers/export', {
      ...params,
      responseType: 'blob'
    }),

  // Import drivers data
  importDrivers: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<{
      success: boolean;
      importedCount: number;
      errors: Array<{ row: number; error: string }>;
    }>('/api/v1/tms/drivers/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default driversApi;
