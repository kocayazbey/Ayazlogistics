import { SetMetadata } from '@nestjs/common';

export const ANALYTICS_KEY = 'analytics';
export const ANALYTICS_OPTIONS_KEY = 'analytics_options';

export interface AnalyticsOptions {
  trackBusinessMetrics?: boolean;
  trackTechnicalMetrics?: boolean;
  trackUserBehavior?: boolean;
  trackPerformanceMetrics?: boolean;
  trackConversionMetrics?: boolean;
  trackRevenueMetrics?: boolean;
  customEvents?: string[];
  trackUserJourney?: boolean;
  trackAbtesting?: boolean;
  trackFunnelAnalysis?: boolean;
  trackCohortAnalysis?: boolean;
  trackRetentionMetrics?: boolean;
  trackEngagementMetrics?: boolean;
  trackErrorAnalytics?: boolean;
  trackApiUsage?: boolean;
  trackDatabaseAnalytics?: boolean;
  trackCacheAnalytics?: boolean;
  trackExternalServiceCalls?: boolean;
  enableRealTimeAnalytics?: boolean;
  enablePredictiveAnalytics?: boolean;
  enableMachineLearning?: boolean;
  dataRetentionDays?: number;
  anonymizeData?: boolean;
  enableDataExport?: boolean;
  enableDataVisualization?: boolean;
}

/**
 * Kapsamlı analytics decorator'ı
 */
export const Analytics = (options: AnalyticsOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(ANALYTICS_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(ANALYTICS_OPTIONS_KEY, {
      trackBusinessMetrics: true,
      trackTechnicalMetrics: true,
      trackUserBehavior: true,
      trackPerformanceMetrics: true,
      trackConversionMetrics: true,
      trackRevenueMetrics: true,
      trackUserJourney: true,
      trackFunnelAnalysis: true,
      trackCohortAnalysis: true,
      trackRetentionMetrics: true,
      trackEngagementMetrics: true,
      trackErrorAnalytics: true,
      trackApiUsage: true,
      trackDatabaseAnalytics: true,
      trackCacheAnalytics: true,
      trackExternalServiceCalls: true,
      enableRealTimeAnalytics: true,
      enablePredictiveAnalytics: true,
      enableMachineLearning: true,
      dataRetentionDays: 365,
      anonymizeData: true,
      enableDataExport: true,
      enableDataVisualization: true,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Önceden tanımlanmış analytics decorator'ları
 */
export const AnalyticsBusiness = () =>
  Analytics({
    trackBusinessMetrics: true,
    trackConversionMetrics: true,
    trackRevenueMetrics: true,
    trackUserBehavior: true,
    trackFunnelAnalysis: true,
    trackCohortAnalysis: true,
    trackRetentionMetrics: true,
    trackEngagementMetrics: true,
  });

export const AnalyticsTechnical = () =>
  Analytics({
    trackTechnicalMetrics: true,
    trackPerformanceMetrics: true,
    trackErrorAnalytics: true,
    trackApiUsage: true,
    trackDatabaseAnalytics: true,
    trackCacheAnalytics: true,
    trackExternalServiceCalls: true,
  });

export const AnalyticsUser = () =>
  Analytics({
    trackUserBehavior: true,
    trackUserJourney: true,
    trackEngagementMetrics: true,
    trackRetentionMetrics: true,
    trackCohortAnalysis: true,
  });

export const AnalyticsPerformance = () =>
  Analytics({
    trackPerformanceMetrics: true,
    trackTechnicalMetrics: true,
    trackApiUsage: true,
    trackDatabaseAnalytics: true,
    trackCacheAnalytics: true,
    enableRealTimeAnalytics: true,
  });

export const AnalyticsRevenue = () =>
  Analytics({
    trackRevenueMetrics: true,
    trackConversionMetrics: true,
    trackBusinessMetrics: true,
    trackFunnelAnalysis: true,
    trackUserBehavior: true,
  });

export const AnalyticsFull = () =>
  Analytics({
    trackBusinessMetrics: true,
    trackTechnicalMetrics: true,
    trackUserBehavior: true,
    trackPerformanceMetrics: true,
    trackConversionMetrics: true,
    trackRevenueMetrics: true,
    trackUserJourney: true,
    trackAbtesting: true,
    trackFunnelAnalysis: true,
    trackCohortAnalysis: true,
    trackRetentionMetrics: true,
    trackEngagementMetrics: true,
    trackErrorAnalytics: true,
    trackApiUsage: true,
    trackDatabaseAnalytics: true,
    trackCacheAnalytics: true,
    trackExternalServiceCalls: true,
    enableRealTimeAnalytics: true,
    enablePredictiveAnalytics: true,
    enableMachineLearning: true,
    enableDataVisualization: true,
  });

export const AnalyticsML = () =>
  Analytics({
    enableMachineLearning: true,
    enablePredictiveAnalytics: true,
    trackUserBehavior: true,
    trackBusinessMetrics: true,
    trackConversionMetrics: true,
    trackCohortAnalysis: true,
    trackRetentionMetrics: true,
  });
