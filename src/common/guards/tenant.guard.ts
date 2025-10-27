import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantService } from '../../core/tenant/tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] || request.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    const tenant = await this.tenantService.getTenantById(tenantId);

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Invalid or inactive tenant');
    }

    request.tenant = tenant;
    request.tenantId = tenantId;

    return true;
  }
}

