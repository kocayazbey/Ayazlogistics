import { Controller, Get } from '@nestjs/common';
import { UnleashService } from '@/core/feature-flags/unleash.service';
import { FEATURE_FLAGS } from '@/core/feature-flags/feature-flags.constants';

@Controller('status')
export class StatusController {
  constructor(private readonly unleash: UnleashService) {}

  @Get()
  getStatus() {
    const testEnabled = this.unleash.isEnabled(FEATURE_FLAGS.STATUS_TEST);
    return {
      status: 'ok',
      featureTest: testEnabled ? 'enabled' : 'disabled',
      timestamp: new Date().toISOString(),
    };
  }
}
