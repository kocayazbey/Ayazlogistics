import { api } from '../api';

export interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  capacity: number;
  fuelType: string;
  status: 'active' | 'inactive' | 'maintenance' | 'out_of_service';
  driver?: {
    id: string;
    name: string;
    phone: string;
  };
  currentLocation?: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  mileage: number;
  lastMaintenance: string;
  nextMaintenance: string;
  insuranceExpiry: string;
  registrationExpiry: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry: string;
  status: 'active' | 'inactive' | 'suspended';
  vehicleId?: string;
  rating: number;
  totalTrips: number;
  createdAt: string;
  updatedAt: string;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  startLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  endLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  waypoints: Array<{
    address: string;
    lat: number;
    lng: number;
    order: number;
  }>;
  distance: number;
  estimatedDuration: number;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
  updatedAt: string;
}

export interface VehicleFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  driverId?: string;
}

export interface DriverFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  licenseType?: string;
}

export interface RouteFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startLocation?: string;
  endLocation?: string;
}

export const vehiclesApi = {
  // Vehicles
  getVehicles: (filter: VehicleFilter = {}) => 
    api.get('/v1/vehicles', { params: filter }),
  
  getVehicle: (id: string) => 
    api.get(`/v1/vehicles/${id}`),
  
  createVehicle: (data: Partial<Vehicle>) => 
    api.post('/v1/vehicles', data),
  
  updateVehicle: (id: string, data: Partial<Vehicle>) => 
    api.put(`/v1/vehicles/${id}`, data),
  
  deleteVehicle: (id: string) => 
    api.delete(`/v1/vehicles/${id}`),
  
  assignDriver: (vehicleId: string, driverId: string) => 
    api.post(`/v1/vehicles/${vehicleId}/driver`, { driverId }),
  
  unassignDriver: (vehicleId: string) => 
    api.delete(`/v1/vehicles/${vehicleId}/driver`),
  
  getVehicleLocation: (id: string) => 
    api.get(`/v1/vehicles/${id}/location`),
  
  updateVehicleLocation: (id: string, location: any) => 
    api.patch(`/v1/vehicles/${id}/location`, location),
  
  getVehicleStats: () => 
    api.get('/v1/vehicles/stats'),
  
  // Drivers
  getDrivers: (filter: DriverFilter = {}) => 
    api.get('/v1/drivers', { params: filter }),
  
  getDriver: (id: string) => 
    api.get(`/v1/drivers/${id}`),
  
  createDriver: (data: Partial<Driver>) => 
    api.post('/v1/drivers', data),
  
  updateDriver: (id: string, data: Partial<Driver>) => 
    api.put(`/v1/drivers/${id}`, data),
  
  deleteDriver: (id: string) => 
    api.delete(`/v1/drivers/${id}`),
  
  getDriverStats: () => 
    api.get('/v1/drivers/stats'),
  
  // Routes
  getRoutes: (filter: RouteFilter = {}) => 
    api.get('/v1/routes', { params: filter }),
  
  getRoute: (id: string) => 
    api.get(`/v1/routes/${id}`),
  
  createRoute: (data: Partial<Route>) => 
    api.post('/v1/routes', data),
  
  updateRoute: (id: string, data: Partial<Route>) => 
    api.put(`/v1/routes/${id}`, data),
  
  deleteRoute: (id: string) => 
    api.delete(`/v1/routes/${id}`),
  
  optimizeRoute: (routeId: string) => 
    api.post(`/v1/routes/${routeId}/optimize`),
  
  getRouteStats: () => 
    api.get('/v1/routes/stats'),
  
  // Tracking
  getActiveVehicles: () => 
    api.get('/v1/tracking/active-vehicles'),
  
  getVehicleHistory: (id: string, dateFrom: string, dateTo: string) => 
    api.get(`/v1/tracking/vehicles/${id}/history`, { 
      params: { dateFrom, dateTo } 
    }),
  
  getFleetStatus: () => 
    api.get('/v1/tracking/fleet-status'),
};
