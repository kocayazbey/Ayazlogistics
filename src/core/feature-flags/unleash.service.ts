import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// Unleash client is optional
let unleashClient: any = null;
try {
  unleashClient = require('unleash-client');
} catch (error) {
  console.warn('Unleash client not available - Feature flags will use basic implementation');
}

@Injectable()
export class UnleashService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UnleashService.name);
  private client: any = null;

  onModuleInit() {
    if (!unleashClient) {
      this.logger.warn('Unleash client not available, skipping initialization');
      return;
    }

    const url = process.env.FEATURE_FLAGS_URL || 'http://localhost:4242/api';
    const appName = process.env.APP_NAME || 'ayazlogistics-backend';
    const token = process.env.FEATURE_FLAGS_CLIENT_KEY || '';

    this.client = unleashClient.initialize({
      url,
      appName,
      customHeaders: token ? { Authorization: token } : undefined,
    });

    this.client.on('ready', () => this.logger.log('Unleash ready'));
    this.client.on('error', (e: any) => this.logger.warn(`Unleash error: ${e?.message || e}`));
  }

  isEnabled(flagName: string, context?: Record<string, any>): boolean {
    if (!this.client) return false;
    return this.client.isEnabled(flagName, context);
  }

  onModuleDestroy() {
    this.client?.destroy();
  }
}
