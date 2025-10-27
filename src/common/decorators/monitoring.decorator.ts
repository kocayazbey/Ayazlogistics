import { SetMetadata } from '@nestjs/common';

export const MONITORING_KEY = 'monitoring';
export const MONITORING_OPTIONS_KEY = 'monitoring_options';

export interface MonitoringOptions {
  trackMetrics?: boolean;
  trackHealth?: boolean;
  trackUptime?: boolean;
  trackErrors?: boolean;
  trackLatency?: boolean;
  trackThroughput?: boolean;
  trackResourceUsage?: boolean;
  customMetrics?: string[];
  alertThresholds?: {
    latency?: number;
    errorRate?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  enableAlerts?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Kapsamlı monitoring decorator'ı
 */
export const Monitoring = (options: MonitoringOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(MONITORING_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(MONITORING_OPTIONS_KEY, {
      trackMetrics: true,
      trackHealth: true,
      trackErrors: true,
      trackLatency: true,
      trackThroughput: true,
      enableAlerts: true,
      logLevel: 'info',
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Önceden tanımlanmış monitoring decorator'ları
 */
export const MonitoringBasic = () =>
  Monitoring({ trackMetrics: true, trackErrors: true });

export const MonitoringFull = () =>
  Monitoring({
    trackMetrics: true,
    trackHealth: true,
    trackUptime: true,
    trackErrors: true,
    trackLatency: true,
    trackThroughput: true,
    trackResourceUsage: true,
    enableAlerts: true,
  });

export const MonitoringPerformance = () =>
  Monitoring({
    trackLatency: true,
    trackThroughput: true,
    trackResourceUsage: true,
    alertThresholds: {
      latency: 1000,
      memoryUsage: 80,
      cpuUsage: 80,
    },
  });

export const MonitoringHealth = () =>
  Monitoring({
    trackHealth: true,
    trackUptime: true,
    trackErrors: true,
    enableAlerts: true,
  });

export const MonitoringCritical = () =>
  Monitoring({
    trackMetrics: true,
    trackHealth: true,
    trackUptime: true,
    trackErrors: true,
    trackLatency: true,
    trackThroughput: true,
    trackResourceUsage: true,
    enableAlerts: true,
    alertThresholds: {
      latency: 500,
      errorRate: 5,
      memoryUsage: 70,
      cpuUsage: 70,
    },
  });
