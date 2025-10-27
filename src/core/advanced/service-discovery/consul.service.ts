import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Consul from 'consul';

@Injectable()
export class ConsulService implements OnModuleInit {
  private readonly logger = new Logger(ConsulService.name);
  private consul: Consul.Consul;
  private serviceId: string;

  constructor() {
    this.consul = new Consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: process.env.CONSUL_PORT || '8500',
      promisify: true,
    });

    this.serviceId = `ayazlogistics-${process.env.HOSTNAME || 'local'}-${Date.now()}`;
  }

  async onModuleInit() {
    await this.registerService();
    setInterval(() => this.sendHealthCheck(), 10000);
  }

  private async registerService(): Promise<void> {
    try {
      await this.consul.agent.service.register({
        id: this.serviceId,
        name: 'ayazlogistics-backend',
        address: process.env.SERVICE_HOST || 'localhost',
        port: parseInt(process.env.PORT || '3000'),
        tags: ['api', 'backend', 'logistics'],
        check: {
          http: `http://${process.env.SERVICE_HOST || 'localhost'}:${process.env.PORT || 3000}/health`,
          interval: '10s',
          timeout: '5s',
        },
      });

      this.logger.log(`Service registered in Consul: ${this.serviceId}`);
    } catch (error) {
      this.logger.error('Failed to register service in Consul:', error);
    }
  }

  private async sendHealthCheck(): Promise<void> {
    try {
      await (this.consul.agent.check as any).pass(this.serviceId);
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }

  async discoverService(serviceName: string): Promise<string | null> {
    try {
      const result = await (this.consul.health as any).service({
        service: serviceName,
        passing: true,
      });

      if (result.length > 0) {
        const service = result[0];
        return `http://${service.Service.Address}:${service.Service.Port}`;
      }

      return null;
    } catch (error) {
      this.logger.error(`Service discovery failed for ${serviceName}:`, error);
      return null;
    }
  }

  async deregisterService(): Promise<void> {
    try {
      await this.consul.agent.service.deregister(this.serviceId);
      this.logger.log(`Service deregistered from Consul: ${this.serviceId}`);
    } catch (error) {
      this.logger.error('Failed to deregister service:', error);
    }
  }
}

