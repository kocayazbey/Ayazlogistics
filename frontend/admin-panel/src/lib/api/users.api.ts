import { api } from '../api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  department?: string;
  avatar?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserFilter {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
  department?: string;
}

export interface RoleFilter {
  page?: number;
  limit?: number;
  search?: string;
  isSystem?: boolean;
}

export const usersApi = {
  // Users
  getAll: (filter: UserFilter = {}) => 
    api.get('/v1/users', { params: filter }),
  
  getOne: (id: string) => 
    api.get(`/v1/users/${id}`),
  
  create: (data: Partial<User>) => 
    api.post('/v1/users', data),
  
  update: (id: string, data: Partial<User>) => 
    api.put(`/v1/users/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/v1/users/${id}`),
  
  toggleStatus: (id: string) => 
    api.patch(`/v1/users/${id}/toggle-status`),
  
  resetPassword: (id: string) => 
    api.post(`/v1/users/${id}/reset-password`),
  
  updatePassword: (id: string, password: string) => 
    api.patch(`/v1/users/${id}/password`, { password }),
  
  getStats: () => 
    api.get('/v1/users/stats'),
  
  // Roles
  getRoles: (filter: RoleFilter = {}) => 
    api.get('/v1/roles', { params: filter }),
  
  getRole: (id: string) => 
    api.get(`/v1/roles/${id}`),
  
  createRole: (data: Partial<Role>) => 
    api.post('/v1/roles', data),
  
  updateRole: (id: string, data: Partial<Role>) => 
    api.put(`/v1/roles/${id}`, data),
  
  deleteRole: (id: string) => 
    api.delete(`/v1/roles/${id}`),
  
  getPermissions: () => 
    api.get('/v1/permissions'),
  
  // User-Role assignments
  assignRole: (userId: string, roleId: string) => 
    api.post(`/v1/users/${userId}/roles`, { roleId }),
  
  removeRole: (userId: string, roleId: string) => 
    api.delete(`/v1/users/${userId}/roles/${roleId}`),
  
  getUserRoles: (userId: string) => 
    api.get(`/v1/users/${userId}/roles`),
};
