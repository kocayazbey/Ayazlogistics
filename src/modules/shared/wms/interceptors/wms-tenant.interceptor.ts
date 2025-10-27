import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * WMS Tenant Isolation Interceptor
 * Ensures all WMS operations are properly scoped to tenant
 */
@Injectable()
export class WmsTenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger('WMS-Tenant');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('No user context found');
    }

    if (!user.tenantId) {
      throw new UnauthorizedException('No tenant context found');
    }

    // Add tenant context to request for easier access
    request.tenantContext = {
      tenantId: user.tenantId,
      organizationId: user.organizationId,
      userId: user.id,
      roles: user.roles || [],
      permissions: user.permissions || [],
    };

    this.logger.debug(
      `Request scoped to tenant: ${user.tenantId} - User: ${user.id}`
    );

    // Validate warehouse access if warehouseId is in request
    const warehouseId = request.body?.warehouseId || request.query?.warehouseId || request.params?.warehouseId;
    
    if (warehouseId) {
      // TODO: Validate that user has access to this warehouse
      this.logger.debug(`Warehouse access check: ${warehouseId}`);
    }

    return next.handle();
  }
}

