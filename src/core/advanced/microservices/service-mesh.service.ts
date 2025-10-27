import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface ServiceRegistration {
  serviceName: string;
  version: string;
  host: string;
  port: number;
  healthCheckEndpoint: string;
  metadata: Record<string, any>;
  tags: string[];
}

interface ServiceInstance {
  id: string;
  serviceName: string;
  version: string;
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
  lastHealthCheck: Date;
  uptime: number;
  requestCount: number;
  errorRate: number;
}

interface CircuitBreakerState {
  serviceName: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailure?: Date;
  nextRetry?: Date;
}

@Injectable()
export class ServiceMeshService {
  private readonly logger = new Logger(ServiceMeshService.name);
  private serviceRegistry = new Map<string, ServiceInstance[]>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  async registerService(registration: ServiceRegistration): Promise<string> {
    const instanceId = `${registration.serviceName}-${Date.now()}`;

    const instance: ServiceInstance = {
      id: instanceId,
      serviceName: registration.serviceName,
      version: registration.version,
      endpoint: `http://${registration.host}:${registration.port}`,
      status: 'starting',
      lastHealthCheck: new Date(),
      uptime: 0,
      requestCount: 0,
      errorRate: 0,
    };

    const instances = this.serviceRegistry.get(registration.serviceName) || [];
    instances.push(instance);
    this.serviceRegistry.set(registration.serviceName, instances);

    this.logger.log(`Service registered: ${registration.serviceName} at ${instance.endpoint}`);

    this.startHealthChecks(instance, registration.healthCheckEndpoint);

    return instanceId;
  }

  private startHealthChecks(instance: ServiceInstance, healthEndpoint: string): void {
    setInterval(async () => {
      try {
        const response = await axios.get(`${instance.endpoint}${healthEndpoint}`, { timeout: 5000 });
        
        if (response.status === 200) {
          instance.status = 'healthy';
          instance.lastHealthCheck = new Date();

          const cb = this.circuitBreakers.get(instance.serviceName);
          if (cb && cb.state !== 'closed') {
            cb.successCount++;
            if (cb.successCount >= 3) {
              cb.state = 'closed';
              cb.failureCount = 0;
              this.logger.log(`Circuit breaker closed for ${instance.serviceName}`);
            }
          }
        }
      } catch (error) {
        instance.status = 'unhealthy';
        this.handleServiceFailure(instance.serviceName);
      }
    }, 30000);
  }

  private handleServiceFailure(serviceName: string): void {
    let cb = this.circuitBreakers.get(serviceName);

    if (!cb) {
      cb = {
        serviceName,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
      };
      this.circuitBreakers.set(serviceName, cb);
    }

    cb.failureCount++;
    cb.lastFailure = new Date();

    if (cb.failureCount >= 5 && cb.state === 'closed') {
      cb.state = 'open';
      cb.nextRetry = new Date(Date.now() + 60000);
      this.logger.error(`Circuit breaker OPEN for ${serviceName}`);
    }
  }

  async callService(serviceName: string, path: string, method: string = 'GET', data?: any): Promise<any> {
    const cb = this.circuitBreakers.get(serviceName);

    if (cb && cb.state === 'open') {
      if (!cb.nextRetry || Date.now() < cb.nextRetry.getTime()) {
        throw new Error(`Circuit breaker open for ${serviceName}`);
      }
      cb.state = 'half_open';
    }

    const instance = this.getHealthyInstance(serviceName);

    if (!instance) {
      throw new Error(`No healthy instances available for ${serviceName}`);
    }

    try {
      const response = await axios({
        method,
        url: `${instance.endpoint}${path}`,
        data,
        timeout: 10000,
        headers: {
          'X-Service-Name': 'ayazlogistics',
          'X-Request-Id': `req_${Date.now()}`,
        },
      });

      instance.requestCount++;

      return response.data;
    } catch (error) {
      instance.errorRate = (instance.errorRate * instance.requestCount + 1) / (instance.requestCount + 1);
      instance.requestCount++;
      
      this.handleServiceFailure(serviceName);
      throw error;
    }
  }

  private getHealthyInstance(serviceName: string): ServiceInstance | null {
    const instances = this.serviceRegistry.get(serviceName) || [];
    const healthyInstances = instances.filter(i => i.status === 'healthy');

    if (healthyInstances.length === 0) return null;

    const leastLoaded = healthyInstances.reduce((prev, current) => 
      prev.requestCount < current.requestCount ? prev : current
    );

    return leastLoaded;
  }

  async discoverServices(serviceName?: string): Promise<ServiceInstance[]> {
    if (serviceName) {
      return this.serviceRegistry.get(serviceName) || [];
    }

    const allInstances: ServiceInstance[] = [];
    this.serviceRegistry.forEach(instances => {
      allInstances.push(...instances);
    });

    return allInstances;
  }

  async deregisterService(instanceId: string): Promise<void> {
    this.serviceRegistry.forEach((instances, serviceName) => {
      const filtered = instances.filter(i => i.id !== instanceId);
      if (filtered.length !== instances.length) {
        this.serviceRegistry.set(serviceName, filtered);
        this.logger.log(`Service deregistered: ${instanceId}`);
      }
    });
  }

  getCircuitBreakerStatus(serviceName: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(serviceName) || null;
  }

  async enableServiceMesh(): Promise<void> {
    this.logger.log('Enabling service mesh with Istio sidecars');
  }
}

