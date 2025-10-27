import { api } from '../api';

export const tmsApiClient = {
  analytics: {
    getDashboard: () => api.get('/v1/tms/analytics/dashboard'),
    getKPIs: (params?: any) => api.get('/v1/tms/analytics/kpis', { params }),
    getPerformance: (tenantId: string, dateFrom?: string, dateTo?: string) => 
      api.get('/v1/tms/analytics/performance', { 
        params: { tenantId, dateFrom, dateTo } 
      }),
    getRouteAnalytics: (tenantId: string, dateFrom?: string, dateTo?: string) => 
      api.get('/v1/tms/analytics/routes', { 
        params: { tenantId, dateFrom, dateTo } 
      }),
    getVehicleAnalytics: (tenantId: string, dateFrom?: string, dateTo?: string) => 
      api.get('/v1/tms/analytics/vehicles', { 
        params: { tenantId, dateFrom, dateTo } 
      }),
  },
  routes: {
    getAll: (params?: any) => api.get('/v1/tms/routes', { params }),
    getOne: (id: string) => api.get(`/v1/tms/routes/${id}`),
    create: (data: any) => api.post('/v1/tms/routes', data),
    update: (id: string, data: any) => api.put(`/v1/tms/routes/${id}`, data),
    delete: (id: string) => api.delete(`/v1/tms/routes/${id}`),
    getStats: () => api.get('/v1/tms/routes/stats'),
    optimize: (id: string) => api.post(`/v1/tms/routes/${id}/optimize`),
    start: (id: string) => api.post(`/v1/tms/routes/${id}/start`),
    complete: (id: string) => api.post(`/v1/tms/routes/${id}/complete`),
  },
  drivers: {
    getAll: (params?: any) => api.get('/v1/tms/drivers', { params }),
    getOne: (id: string) => api.get(`/v1/tms/drivers/${id}`),
    create: (data: any) => api.post('/v1/tms/drivers', data),
    update: (id: string, data: any) => api.put(`/v1/tms/drivers/${id}`, data),
    delete: (id: string) => api.delete(`/v1/tms/drivers/${id}`),
  },
  vehicles: {
    getAll: (params?: any) => api.get('/v1/tms/vehicles', { params }),
    getOne: (id: string) => api.get(`/v1/tms/vehicles/${id}`),
    create: (data: any) => api.post('/v1/tms/vehicles', data),
    update: (id: string, data: any) => api.put(`/v1/tms/vehicles/${id}`, data),
    delete: (id: string) => api.delete(`/v1/tms/vehicles/${id}`),
    scheduleMaintenance: (id: string, maintenanceType: string, scheduledDate: string) => 
      api.post(`/v1/tms/vehicles/${id}/maintenance`, { maintenanceType, scheduledDate }),
  },
  tracking: {
    getAll: (params?: any) => api.get('/v1/tms/tracking', { params }),
    create: (data: any) => api.post('/v1/tms/tracking', data),
    update: (id: string, data: any) => api.put(`/v1/tms/tracking/${id}`, data),
    getCurrentLocation: (vehicleId: string) => api.get(`/v1/tms/tracking/current/${vehicleId}`),
    getShipment: (trackingNumber: string) => api.get(`/v1/tms/tracking/${trackingNumber}`),
    updateLocation: (shipmentId: string, data: any) => api.post(`/v1/tms/tracking/${shipmentId}/location`, data),
  },
  loadBoard: {
    getAvailableLoads: (params?: any) => api.get('/v1/tms/loads/available', { params }),
    getMyLoads: (params?: any) => api.get('/v1/tms/loads/my', { params }),
    createLoad: (data: any) => api.post('/v1/tms/loads', data),
    assignLoad: (loadId: string, driverId: string) => api.post(`/v1/tms/loads/${loadId}/assign`, { driverId }),
  },
};

export default tmsApiClient;