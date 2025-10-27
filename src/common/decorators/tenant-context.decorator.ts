import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const TenantContext = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (data) {
      return user?.[data];
    }

    return {
      tenantId: user?.tenantId,
      userId: user?.id,
      role: user?.role,
      permissions: user?.permissions,
    };
  },
);
