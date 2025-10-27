import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ANALYTICS_KEY, ANALYTICS_OPTIONS_KEY } from '../decorators/analytics.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveAnalyticsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ComprehensiveAnalyticsInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isAnalyticsEnabled = this.reflector.get<boolean>(ANALYTICS_KEY, context.getHandler());
    const options = this.reflector.get<any>(ANALYTICS_OPTIONS_KEY, context.getHandler());
    
    if (!isAnalyticsEnabled) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user;
    const tenantId = user?.tenantId;
    const userId = user?.id;
    const sessionId = request.headers['x-session-id'] || this.generateSessionId();
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    return next.handle().pipe(
      tap((data) => {
        const executionTime = Date.now() - startTime;
        
        const analyticsData = {
          requestId,
          sessionId,
          tenantId,
          userId,
          method: request.method,
          url: request.url,
          userAgent: request.headers['user-agent'],
          referer: request.headers.referer,
          ip: request.ip,
          executionTime,
          responseSize: JSON.stringify(data).length,
          statusCode: response.statusCode,
          timestamp: new Date(),
          businessMetrics: this.extractBusinessMetrics(data, options),
          technicalMetrics: this.extractTechnicalMetrics(data, options),
          userBehavior: this.extractUserBehavior(request, user, options),
        };

        this.logAnalytics(analyticsData, options);
      }),
      catchError((error) => {
        const executionTime = Date.now() - startTime;
        
        const errorAnalytics = {
          requestId,
          sessionId,
          tenantId,
          userId,
          method: request.method,
          url: request.url,
          executionTime,
          error: {
            message: error.message,
            statusCode: error.status || 500,
            stack: error.stack,
          },
          timestamp: new Date(),
        };

        this.logErrorAnalytics(errorAnalytics, options);
        throw error;
      }),
    );
  }

  private extractBusinessMetrics(data: any, options: any) {
    if (!options?.trackBusinessMetrics) return null;

    return {
      conversion: this.detectConversion(data),
      revenue: this.extractRevenue(data),
      customerValue: this.extractCustomerValue(data),
      productMetrics: this.extractProductMetrics(data),
      salesMetrics: this.extractSalesMetrics(data),
    };
  }

  private extractTechnicalMetrics(data: any, options: any) {
    if (!options?.trackTechnicalMetrics) return null;

    return {
      apiUsage: this.extractApiUsage(data),
      databaseQueries: this.extractDatabaseQueries(data),
      cacheHits: this.extractCacheHits(data),
      externalCalls: this.extractExternalCalls(data),
      performance: this.extractPerformanceMetrics(data),
    };
  }

  private extractUserBehavior(request: any, user: any, options: any) {
    if (!options?.trackUserBehavior) return null;

    return {
      userId: user?.id,
      sessionId: request.headers['x-session-id'],
      userAgent: request.headers['user-agent'],
      referer: request.headers.referer,
      ip: request.ip,
      timestamp: new Date(),
      journey: this.extractUserJourney(request, user),
      engagement: this.extractEngagementMetrics(request, user),
      retention: this.extractRetentionMetrics(request, user),
    };
  }

  private detectConversion(data: any): boolean {
    // Implement conversion detection logic
    return data?.conversion || false;
  }

  private extractRevenue(data: any): number {
    // Implement revenue extraction logic
    return data?.revenue || 0;
  }

  private extractCustomerValue(data: any): number {
    // Implement customer value extraction logic
    return data?.customerValue || 0;
  }

  private extractProductMetrics(data: any): any {
    // Implement product metrics extraction logic
    return data?.productMetrics || {};
  }

  private extractSalesMetrics(data: any): any {
    // Implement sales metrics extraction logic
    return data?.salesMetrics || {};
  }

  private extractApiUsage(data: any): any {
    // Implement API usage extraction logic
    return data?.apiUsage || {};
  }

  private extractDatabaseQueries(data: any): any {
    // Implement database queries extraction logic
    return data?.databaseQueries || {};
  }

  private extractCacheHits(data: any): any {
    // Implement cache hits extraction logic
    return data?.cacheHits || {};
  }

  private extractExternalCalls(data: any): any {
    // Implement external calls extraction logic
    return data?.externalCalls || {};
  }

  private extractPerformanceMetrics(data: any): any {
    // Implement performance metrics extraction logic
    return data?.performance || {};
  }

  private extractUserJourney(request: any, user: any): any {
    // Implement user journey extraction logic
    return {
      currentStep: request.url,
      previousStep: request.headers.referer,
      journeyStage: this.determineJourneyStage(request.url),
    };
  }

  private extractEngagementMetrics(request: any, user: any): any {
    // Implement engagement metrics extraction logic
    return {
      timeOnPage: 0, // Would be calculated from session data
      interactions: 0, // Would be calculated from user interactions
      depth: this.calculatePageDepth(request.url),
    };
  }

  private extractRetentionMetrics(request: any, user: any): any {
    // Implement retention metrics extraction logic
    return {
      isReturningUser: false, // Would be determined from user history
      daysSinceLastVisit: 0, // Would be calculated from user history
      lifetimeValue: 0, // Would be calculated from user history
    };
  }

  private determineJourneyStage(url: string): string {
    // Implement journey stage determination logic
    if (url.includes('/checkout')) return 'checkout';
    if (url.includes('/cart')) return 'cart';
    if (url.includes('/product')) return 'product';
    if (url.includes('/search')) return 'search';
    return 'browsing';
  }

  private calculatePageDepth(url: string): number {
    // Implement page depth calculation logic
    return url.split('/').length - 1;
  }

  private logAnalytics(data: any, options: any) {
    if (options?.enableRealTimeAnalytics) {
      this.logger.log(`[REAL-TIME ANALYTICS] ${JSON.stringify(data)}`);
    } else {
      this.logger.log(`[ANALYTICS] ${data.method} ${data.url} - ${data.statusCode} - ${data.executionTime}ms`);
    }
  }

  private logErrorAnalytics(data: any, options: any) {
    if (options?.trackErrorAnalytics) {
      this.logger.error(`[ERROR ANALYTICS] ${JSON.stringify(data)}`);
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
