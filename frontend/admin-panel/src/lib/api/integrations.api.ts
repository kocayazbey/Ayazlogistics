import { api } from './api';

export interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  lastSync: string;
  syncFrequency: string;
  apiVersion: string;
  endpoint: string;
}

export const integrationsApi = {
  getIntegrations: (params?: any) => api.get('/v1/integrations', { params }),
  getIntegration: (id: string) => api.get(`/v1/integrations/${id}`),
  createIntegration: (data: any) => api.post('/v1/integrations', data),
  updateIntegration: (id: string, data: any) => api.put(`/v1/integrations/${id}`, data),
  deleteIntegration: (id: string) => api.delete(`/v1/integrations/${id}`),
  testConnection: (id: string) => api.post(`/v1/integrations/${id}/test`),
  syncIntegration: (id: string) => api.post(`/v1/integrations/${id}/sync`),
};

