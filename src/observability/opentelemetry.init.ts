/* Optional OpenTelemetry initialization guarded by env flags */
export async function initializeOpenTelemetry(): Promise<void> {
  if (process.env.OTEL_ENABLED !== 'true') return;

  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = await import('@opentelemetry/resources');
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions');
    const { ParentBasedSampler, TraceIdRatioBasedSampler } = await import('@opentelemetry/sdk-trace-base');
    const { OTLPMetricExporter } = await import('@opentelemetry/exporter-metrics-otlp-http');
    const { PeriodicExportingMetricReader } = await import('@opentelemetry/sdk-metrics');

    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: {},
    });

    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
      headers: {},
    });

    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter as any, // TODO: Fix type compatibility issue
      exportIntervalMillis: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || '60000', 10),
    });

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'ayazlogistics-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    } as any);

    const sampleRate = parseFloat(process.env.OTEL_TRACES_SAMPLE_RATE || '0.1');
    const sampler = new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(sampleRate) });

    const sdk = new NodeSDK({
      traceExporter,
      instrumentations: [getNodeAutoInstrumentations()],
      resource,
      sampler,
      metricReader,
    });

    await sdk.start();
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry initialized');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('OpenTelemetry not initialized (missing deps?):', err?.message || err);
  }
}
