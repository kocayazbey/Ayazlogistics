import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;

    if (user?.tenantId) {
      // Set tenant context for database operations
      req.headers['x-tenant-id'] = user.tenantId;
      req.headers['x-user-id'] = user.id;
      req.headers['x-user-role'] = user.role;
    }

    next();
  }
}
