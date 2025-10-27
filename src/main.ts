import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AdvancedValidationPipe } from './common/pipes/advanced-validation.pipe';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';
import { BusinessExceptionFilter } from './common/filters/business-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { OwaspCrsMiddleware } from './common/middleware/owasp-crs.middleware';
import { CspMiddleware } from './common/middleware/csp.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { SecurityMiddleware, RequestSizeLimitMiddleware, DdosProtectionMiddleware } from './common/middleware/security.middleware';
import { TraceContextInterceptor } from './common/interceptors/trace-context.interceptor';
import { SloTrackingInterceptor } from './common/interceptors/slo-tracking.interceptor';
import { AuditPiiRedactionInterceptor } from './common/interceptors/audit-pii-redaction.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix (versioned)
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(`${apiPrefix}/v1`);

  // Global validation pipe with enhanced security
  app.useGlobalPipes(new AdvancedValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    disableErrorMessages: false,
  }));

  // Global middleware (Security First - Layered Defense)
  app.use(new RequestSizeLimitMiddleware().use);
  app.use(new DdosProtectionMiddleware().use);
  app.use(new SecurityMiddleware().use);
  app.use(new RateLimitMiddleware().use);
  app.use(new RequestIdMiddleware().use);
  app.use(new OwaspCrsMiddleware().use);
  app.use(new CspMiddleware().use);

  // Global interceptors
  app.useGlobalInterceptors(
    new TraceContextInterceptor(),
    new SloTrackingInterceptor(),
    new AuditPiiRedactionInterceptor()
  );

  // Global exception filters
  app.useGlobalFilters(
    new GlobalExceptionFilter(),
    new ValidationExceptionFilter(),
    new BusinessExceptionFilter()
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-ID'],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('AyazLogistics API')
    .setDescription('Comprehensive Logistics Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Security', 'Security and compliance endpoints')
    .addTag('Observability', 'Monitoring and observability endpoints')
    .addTag('Resilience', 'Resilience and performance endpoints')
    .addTag('Testing', 'Testing and quality assurance endpoints')
    .addTag('Data', 'Data management and quality endpoints')
    .addTag('Feature Flags', 'Feature flag management endpoints')
    .addTag('Infrastructure', 'Infrastructure and deployment endpoints')
    .addTag('Development', 'Development and tooling endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 AyazLogistics API çalışıyor - Port: ${port}`);
  console.log(`📚 API Dokümantasyonu: http://localhost:${port}/api`);
  console.log(`✅ Tüm modüller aktif: Products, Lot Management, Warehouse Operations, Handheld Terminal, Vehicle Tracking, Accounting, Supplier Integration, Pricing & Campaigns`);
}

bootstrap();