import { Injectable } from '@nestjs/common';
import * as newrelic from 'newrelic';

/**
 * APM (Application Performance Monitoring) Service
 * Integration with New Relic / DataDog
 */

@Injectable()
export class APMService {
  /**
   * Track custom transaction
   */
  startTransaction(name: string, type: string = 'web'): any {
    if (process.env.NEW_RELIC_ENABLED === 'true') {
      return newrelic.startWebTransaction(name);
    }
    return null;
  }

  /**
   * End transaction
   */
  endTransaction(transaction: any): void {
    if (transaction) {
      transaction.end();
    }
  }

  /**
   * Record custom metric
   */
  recordMetric(name: string, value: number): void {
    if (process.env.NEW_RELIC_ENABLED === 'true') {
      newrelic.recordMetric(name, value);
    }
  }

  /**
   * Record custom event
   */
  recordEvent(eventType: string, attributes: Record<string, any>): void {
    if (process.env.NEW_RELIC_ENABLED === 'true') {
      newrelic.recordCustomEvent(eventType, attributes);
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(operation: string, table: string, duration: number): void {
    this.recordMetric(`Database/${operation}/${table}`, duration);
    
    if (duration > 1000) {
      this.recordEvent('SlowQuery', {
        operation,
        table,
        duration,
        threshold: 1000,
      });
    }
  }

  /**
   * Track external API call
   */
  trackExternalAPI(service: string, endpoint: string, duration: number, statusCode: number): void {
    this.recordMetric(`ExternalAPI/${service}/${endpoint}`, duration);
    this.recordEvent('ExternalAPICall', {
      service,
      endpoint,
      duration,
      statusCode,
    });
  }

  /**
   * Track business metric
   */
  trackBusinessMetric(metricName: string, value: number, attributes?: Record<string, any>): void {
    this.recordMetric(`Business/${metricName}`, value);
    
    if (attributes) {
      this.recordEvent('BusinessMetric', {
        metricName,
        value,
        ...attributes,
      });
    }
  }

  /**
   * Add custom attribute to current transaction
   */
  addCustomAttribute(key: string, value: string | number | boolean): void {
    if (process.env.NEW_RELIC_ENABLED === 'true') {
      newrelic.addCustomAttribute(key, value);
    }
  }

  /**
   * Set user context
   */
  setUser(userId: string, attributes?: Record<string, any>): void {
    this.addCustomAttribute('userId', userId);
    
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        this.addCustomAttribute(key, value);
      });
    }
  }

  /**
   * Notice error manually
   */
  noticeError(error: Error, customAttributes?: Record<string, any>): void {
    if (process.env.NEW_RELIC_ENABLED === 'true') {
      newrelic.noticeError(error, customAttributes);
    }
  }
}

/**
 * DataDog APM Service (Alternative)
 */
import tracer from 'dd-trace';

@Injectable()
export class DataDogAPMService {
  constructor() {
    if (process.env.DATADOG_ENABLED === 'true') {
      tracer.init({
        service: 'ayazlogistics-api',
        env: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        logInjection: true,
        analytics: true,
      });
    }
  }

  /**
   * Create custom span
   */
  trace<T>(operationName: string, fn: () => T | Promise<T>): T | Promise<T> {
    if (process.env.DATADOG_ENABLED !== 'true') {
      return fn();
    }

    const span = tracer.scope().active();
    if (!span) return fn();

    const childSpan = tracer.startSpan(operationName, {
      childOf: span,
    });

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => childSpan.finish()) as T;
      }
      
      childSpan.finish();
      return result;
    } catch (error) {
      childSpan.setTag('error', true);
      childSpan.log({ event: 'error', message: error.message });
      childSpan.finish();
      throw error;
    }
  }

  /**
   * Add tags to current span
   */
  addTags(tags: Record<string, any>): void {
    if (process.env.DATADOG_ENABLED === 'true') {
      const span = tracer.scope().active();
      if (span) {
        Object.entries(tags).forEach(([key, value]) => {
          span.setTag(key, value);
        });
      }
    }
  }

  /**
   * Track metric
   */
  gauge(metric: string, value: number, tags?: string[]): void {
    if (process.env.DATADOG_ENABLED === 'true') {
      // Using dogstatsd client
      // dogstatsd.gauge(metric, value, tags);
    }
  }
}

