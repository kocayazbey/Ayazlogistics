import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);

  constructor(private readonly configService: ConfigService) {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    
    if (dsn) {
      const environment = this.configService.get<string>('SENTRY_ENVIRONMENT', 'development');
      const tracesSampleRate = this.configService.get<string>('SENTRY_TRACES_SAMPLE_RATE', '0.1');
      
      Sentry.init({
        dsn,
        environment,
        tracesSampleRate: parseFloat(tracesSampleRate),
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
        ],
      });
      this.logger.log('Sentry initialized');
    }
  }

  captureException(error: Error, context?: Record<string, any>): void {
    Sentry.captureException(error, { extra: context });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email: string; username?: string }): void {
    Sentry.setUser(user);
  }

  addBreadcrumb(breadcrumb: { message: string; category?: string; level?: Sentry.SeverityLevel; data?: any }): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  startTransaction(name: string, op: string): any {
    return Sentry.startTransaction({ name, op });
  }
}

