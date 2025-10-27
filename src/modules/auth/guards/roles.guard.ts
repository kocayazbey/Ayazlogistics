import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId: string;
  warehouseId: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user || !user.role) {
      this.logger.warn('User or user role not found in request');
      return false;
    }

    // Check if user has required role
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      this.logger.warn(`Access denied for user ${user.id} (${user.role}). Required roles: ${requiredRoles.join(', ')}`);
      return false;
    }

    // Log successful authorization
    this.logger.debug(`Role-based access granted for user ${user.id} (${user.role}) to ${context.getHandler().name}`);

    return true;
  }
}

