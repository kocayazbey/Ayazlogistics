import { Module, Global } from '@nestjs/common';
import { UnleashService } from './unleash.service';

@Global()
@Module({
  providers: [UnleashService],
  exports: [UnleashService],
})
export class FeatureFlagsModule {}
