import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import { ErrorMonitoringService } from './services/error-monitoring.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RetryService } from './services/retry.service';
import { TimeoutService } from './services/timeout.service';
import { HealthCheckService } from './services/health-check.service';
import { GracefulShutdownService } from './services/graceful-shutdown.service';
import { ErrorRecoveryService } from './services/error-recovery.service';
import { CacheService } from './services/cache.service';
import { QueryOptimizerService } from './services/query-optimizer.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { N1QueryOptimizerService } from './services/n1-query-optimizer.service';
import { BundleOptimizerService } from './services/bundle-optimizer.service';
import { CodeQualityService } from './services/code-quality.service';
import { AuditLoggingService } from './services/audit-logging.service';
import { ComprehensiveLoggerService } from './services/comprehensive-logger.service';

// Filters
import { GlobalExceptionFilter } from './filters/global-exception.filter';

// Interceptors
import { ErrorRecoveryInterceptor } from './interceptors/error-recovery.interceptor';
import { CircuitBreakerInterceptor } from './interceptors/circuit-breaker.interceptor';
import { RetryInterceptor } from './interceptors/retry.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';

// Guards
import { ErrorRecoveryGuard } from './guards/error-recovery.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

// Middleware
import { ErrorLoggingMiddleware } from './middleware/error-logging.middleware';
import { SecurityMiddleware, InputSanitizationMiddleware } from './middleware/security.middleware';

// Controllers
import { PerformanceController } from './controllers/performance.controller';
import { CodeQualityController } from './controllers/code-quality.controller';
import { AuditController } from './controllers/audit.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PerformanceController, CodeQualityController, AuditController],
  providers: [
    // Services
    ErrorMonitoringService,
    CircuitBreakerService,
    RetryService,
    TimeoutService,
    HealthCheckService,
    GracefulShutdownService,
    ErrorRecoveryService,
    CacheService,
    QueryOptimizerService,
    PerformanceMonitorService,
    N1QueryOptimizerService,
    BundleOptimizerService,
    CodeQualityService,
    AuditLoggingService,
    ComprehensiveLoggerService,
    
    // Filters
    GlobalExceptionFilter,
    
    // Interceptors
    ErrorRecoveryInterceptor,
    CircuitBreakerInterceptor,
    RetryInterceptor,
    TimeoutInterceptor,
    CacheInterceptor,
    PerformanceInterceptor,
    AuditLoggingInterceptor,
    
    // Guards
    ErrorRecoveryGuard,
    RateLimitGuard,
    
    // Middleware
    ErrorLoggingMiddleware,
    SecurityMiddleware,
    InputSanitizationMiddleware,
  ],
  exports: [
    // Services
    ErrorMonitoringService,
    CircuitBreakerService,
    RetryService,
    TimeoutService,
    HealthCheckService,
    GracefulShutdownService,
    ErrorRecoveryService,
    CacheService,
    QueryOptimizerService,
    PerformanceMonitorService,
    N1QueryOptimizerService,
    BundleOptimizerService,
    CodeQualityService,
    AuditLoggingService,
    ComprehensiveLoggerService,
    
    // Filters
    GlobalExceptionFilter,
    
    // Interceptors
    ErrorRecoveryInterceptor,
    CircuitBreakerInterceptor,
    RetryInterceptor,
    TimeoutInterceptor,
    CacheInterceptor,
    PerformanceInterceptor,
    AuditLoggingInterceptor,
    
    // Guards
    ErrorRecoveryGuard,
    RateLimitGuard,
    
    // Middleware
    ErrorLoggingMiddleware,
    SecurityMiddleware,
    InputSanitizationMiddleware,
  ],
})
export class CommonModule {}