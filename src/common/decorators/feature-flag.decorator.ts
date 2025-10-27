import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { FeatureFlagGuard } from '../guards/feature-flag.guard';

export const FEATURE_FLAG_KEY = 'feature-flag';

export interface FeatureFlagConfig {
  flagName: string;
  defaultValue?: boolean;
  userIdParam?: string;
  tenantIdParam?: string;
}

export const FeatureFlag = (config: FeatureFlagConfig) => {
  return applyDecorators(
    SetMetadata(FEATURE_FLAG_KEY, config),
    UseGuards(FeatureFlagGuard)
  );
};