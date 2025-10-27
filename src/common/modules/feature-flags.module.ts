import { Module } from '@nestjs/common';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FeatureFlagGuard } from '../guards/feature-flag.guard';
import { FeatureFlagsController } from '../controllers/feature-flags.controller';

@Module({
  providers: [FeatureFlagsService, FeatureFlagGuard],
  controllers: [FeatureFlagsController],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
