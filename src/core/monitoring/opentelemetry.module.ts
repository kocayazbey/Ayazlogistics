import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpentelemetryService } from './opentelemetry.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OpentelemetryService,
      useFactory: (configService: ConfigService) => {
        const otelEnabled = configService.get<boolean>('OTEL_ENABLED', true);
        
        if (!otelEnabled) {
          return null;
        }

        const logger = new Logger('OpenTelemetry');
        logger.log('Initializing OpenTelemetry...');
        
        return new OpentelemetryService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [OpentelemetryService],
})
export class OpenTelemetryModule {
  private readonly logger = new Logger(OpenTelemetryModule.name);

  constructor(private readonly configService: ConfigService) {
    const otelEnabled = this.configService.get<boolean>('OTEL_ENABLED', true);
    
    if (otelEnabled) {
      this.logger.log('OpenTelemetry module initialized');
    } else {
      this.logger.warn('OpenTelemetry is disabled');
    }
  }
}
