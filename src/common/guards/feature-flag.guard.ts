import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FEATURE_FLAG_KEY, FeatureFlagConfig } from '../decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagsService: FeatureFlagsService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.get<FeatureFlagConfig>(FEATURE_FLAG_KEY, context.getHandler());
    
    if (!config) {
      return true; // No feature flag required
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.params[config.userIdParam || 'userId'];
    const tenantId = request.user?.tenantId || request.params[config.tenantIdParam || 'tenantId'];

    const isEnabled = this.featureFlagsService.isEnabled(config.flagName, userId, tenantId);
    
    if (!isEnabled) {
      throw new ForbiddenException(`Feature ${config.flagName} is not enabled`);
    }

    return true;
  }
}
