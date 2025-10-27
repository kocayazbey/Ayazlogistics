import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QuotaService {
  private readonly logger = new Logger('QuotaService');
  private readonly quotas = new Map<string, any>();

  setTenantQuota(tenantId: string, quota: any): void {
    this.quotas.set(`tenant:${tenantId}`, quota);
    this.logger.debug(`Set quota for tenant ${tenantId}`);
  }

  setEndpointQuota(endpoint: string, quota: any): void {
    this.quotas.set(`endpoint:${endpoint}`, quota);
    this.logger.debug(`Set quota for endpoint ${endpoint}`);
  }

  checkQuota(tenantId: string, endpoint: string): boolean {
    const tenantQuota = this.quotas.get(`tenant:${tenantId}`);
    const endpointQuota = this.quotas.get(`endpoint:${endpoint}`);
    
    if (tenantQuota && tenantQuota.remaining <= 0) {
      this.logger.warn(`Tenant quota exceeded for ${tenantId}`);
      return false;
    }
    
    if (endpointQuota && endpointQuota.remaining <= 0) {
      this.logger.warn(`Endpoint quota exceeded for ${endpoint}`);
      return false;
    }
    
    return true;
  }

  consumeQuota(tenantId: string, endpoint: string): void {
    const tenantQuota = this.quotas.get(`tenant:${tenantId}`);
    const endpointQuota = this.quotas.get(`endpoint:${endpoint}`);
    
    if (tenantQuota) {
      tenantQuota.remaining--;
    }
    
    if (endpointQuota) {
      endpointQuota.remaining--;
    }
  }
}
