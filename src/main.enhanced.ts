import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { GracefulShutdownService } from './common/services/graceful-shutdown.service';
import { PerformanceMonitorService } from './common/services/performance-monitor.service';
import { ErrorMonitoringService } from './common/services/error-monitoring.service';
import { CircuitBreakerService } from './common/services/circuit-breaker.service';
import { CacheService } from '../../common/services/cache.service';
import { QueryOptimizerService } from './common/services/query-optimizer.service';
import { N1QueryOptimizerService } from './common/services/n1-query-optimizer.service';
import { BundleOptimizerService } from './common/services/bundle-optimizer.service';
import { validateEnv } from './config/env.validation';
import { initializeOpenTelemetry } from './observability/opentelemetry.init';
import { RedisService } from './core/cache/redis.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    await initializeOpenTelemetry();
    validateEnv();

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);

    // Ensure Redis connection (idempotency, rate limit, cache, etc.)
    const redisService = app.get(RedisService);
    try {
      await redisService.connect();
      logger.log('Redis connection established');
    } catch (e) {
      logger.warn(`Redis connection could not be established at startup: ${e?.message || e}`);
    }

    const apiPrefix = configService.get<string>('API_PREFIX', 'api');
    app.setGlobalPrefix(`${apiPrefix}/v1`);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: false,
        validationError: { target: false, value: false },
      }),
    );

    app.useGlobalFilters(new GlobalExceptionFilter());

    const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
    const isProduction = configService.get<string>('NODE_ENV') === 'production';

    let corsOrigins: string[] | string = '*';
    if (isProduction) {
      corsOrigins = corsOrigin.split(',').map(origin => origin.trim()).filter(origin => origin !== '*');
      if (corsOrigins.length === 0) {
        throw new Error('CORS_ORIGIN must be specified in production with specific domains');
      }
    } else {
      corsOrigins = corsOrigin === '*' ? '*' : corsOrigin.split(',').map(origin => origin.trim());
    }

    const corsCredentials = configService.get<string>('CORS_CREDENTIALS', 'true') === 'true';

    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key'],
      credentials: corsCredentials,
    });

    const enableSwagger = configService.get<string>('ENABLE_SWAGGER', 'false') === 'true';
    if (enableSwagger) {
      const config = new DocumentBuilder()
        .setTitle('AyazLogistics API')
        .setDescription('Comprehensive Logistics Management System API')
        .setVersion('1.0')
        .addBearerAuth()
        .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' })
        .addTag('Authentication', 'User authentication and authorization')
        .addTag('WMS', 'Warehouse Management System')
        .addTag('TMS', 'Transportation Management System')
        .addTag('Billing', 'Billing and invoicing')
        .addTag('Realtime', 'Real-time features')
        .addTag('Performance', 'Performance monitoring and optimization')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
    }

    const gracefulShutdownService = app.get(GracefulShutdownService);
    const performanceMonitorService = app.get(PerformanceMonitorService);
    const errorMonitoringService = app.get(ErrorMonitoringService);
    const circuitBreakerService = app.get(CircuitBreakerService);
    const cacheService = app.get(CacheService);
    const queryOptimizerService = app.get(QueryOptimizerService);
    const n1QueryOptimizerService = app.get(N1QueryOptimizerService);
    const bundleOptimizerService = app.get(BundleOptimizerService);

    gracefulShutdownService.enableGracefulShutdown(app);
    performanceMonitorService.startMonitoring();
    errorMonitoringService.startMonitoring();
    circuitBreakerService.initialize();
    cacheService.initialize();
    queryOptimizerService.initialize();
    n1QueryOptimizerService.initialize();
    bundleOptimizerService.initialize();

    const port = configService.get('PORT', 3000);
    await app.listen(port);

    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    if (enableSwagger) {
      logger.log(`📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`);
    }
    logger.log(`🔍 Health Check: http://localhost:${port}/${apiPrefix}/v1/health`);
  } catch (error) {
    logger.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
