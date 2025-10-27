import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as opentelemetry from '@opentelemetry/api';
import { Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { initializeOpenTelemetry } from './opentelemetry.config';

@Injectable()
export class OpentelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpentelemetryService.name);
  private sdk: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const otelEnabled = this.configService.get<boolean>('OTEL_ENABLED', true);

    if (!otelEnabled) {
      this.logger.log('OpenTelemetry is disabled');
      return;
    }

    try {
      this.sdk = initializeOpenTelemetry();
      this.sdk.start();
      this.logger.log('OpenTelemetry SDK started successfully');
    } catch (error) {
      this.logger.error('Failed to start OpenTelemetry SDK', error);
    }
  }

  async onModuleDestroy() {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        this.logger.log('OpenTelemetry SDK shutdown successfully');
      } catch (error) {
        this.logger.error('Error during OpenTelemetry SDK shutdown', error);
      }
    }
  }

  /**
   * Get the current active span
   */
  getActiveSpan(): Span | undefined {
    const tracer = opentelemetry.trace.getTracer('ayazlogistics');
    return opentelemetry.trace.getActiveSpan();
  }

  /**
   * Start a new span
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
    },
  ): Span {
    const tracer = opentelemetry.trace.getTracer('ayazlogistics');
    const span = tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes || {},
    });

    return span;
  }

  /**
   * Add attributes to the current span
   */
  addAttributes(attributes: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });
    }
  }

  /**
   * Set status on the current span
   */
  setStatus(status: { code: SpanStatusCode; message?: string }): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setStatus(status);
    }
  }

  /**
   * Add an event to the current span
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Record an exception in the current span
   */
  recordException(exception: Error, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.recordException(exception, attributes);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: exception.message,
      });
    }
  }

  /**
   * Execute a function within a span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => T | Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, any>;
    },
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      this.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get trace context for propagation
   */
  getTraceContext(): Record<string, string> {
    const carrier: Record<string, string> = {};
    const propagator = opentelemetry.propagation;
    const context = opentelemetry.context.active();

    propagator.inject(context, carrier);

    return carrier;
  }

  /**
   * Extract trace context from headers
   */
  extractTraceContext(headers: Record<string, string>): any {
    const propagator = opentelemetry.propagation;
    const context = propagator.extract(opentelemetry.context.active(), headers);

    return context;
  }
}
