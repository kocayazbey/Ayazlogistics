import { SetMetadata } from '@nestjs/common';

export const TENANT_KEY = 'tenant';
export const TENANT_OPTIONS_KEY = 'tenant_options';

export interface TenantOptions {
  isolationLevel: 'none' | 'basic' | 'strict' | 'critical';
  requireTenantId?: boolean;
  validateTenantAccess?: boolean;
  enforceDataIsolation?: boolean;
  enableTenantFiltering?: boolean;
  enableTenantAuditing?: boolean;
  enableTenantMetrics?: boolean;
  enableTenantBilling?: boolean;
  enableTenantQuotas?: boolean;
  enableTenantSecurity?: boolean;
  enableTenantBackup?: boolean;
  enableTenantRestore?: boolean;
  enableTenantMigration?: boolean;
  enableTenantCloning?: boolean;
  enableTenantArchiving?: boolean;
  enableTenantDeletion?: boolean;
  enableTenantSuspension?: boolean;
  enableTenantActivation?: boolean;
  enableTenantConfiguration?: boolean;
  enableTenantCustomization?: boolean;
  enableTenantIntegration?: boolean;
  enableTenantReporting?: boolean;
  enableTenantAnalytics?: boolean;
  enableTenantMonitoring?: boolean;
  enableTenantAlerting?: boolean;
  enableTenantLogging?: boolean;
  enableTenantTracing?: boolean;
  enableTenantProfiling?: boolean;
  enableTenantOptimization?: boolean;
  enableTenantScaling?: boolean;
  enableTenantLoadBalancing?: boolean;
  enableTenantCaching?: boolean;
  enableTenantCDN?: boolean;
  enableTenantSSL?: boolean;
  enableTenantEncryption?: boolean;
  enableTenantCompression?: boolean;
  enableTenantDeduplication?: boolean;
  enableTenantReplication?: boolean;
  enableTenantSharding?: boolean;
  enableTenantPartitioning?: boolean;
  enableTenantIndexing?: boolean;
  enableTenantSearch?: boolean;
  enableTenantFiltering?: boolean;
  enableTenantSorting?: boolean;
  enableTenantPagination?: boolean;
  enableTenantAggregation?: boolean;
  enableTenantGrouping?: boolean;
  enableTenantJoining?: boolean;
  enableTenantUnion?: boolean;
  enableTenantIntersection?: boolean;
  enableTenantDifference?: boolean;
  enableTenantComplement?: boolean;
  enableTenantSymmetricDifference?: boolean;
  enableTenantCartesianProduct?: boolean;
  enableTenantNaturalJoin?: boolean;
  enableTenantInnerJoin?: boolean;
  enableTenantLeftJoin?: boolean;
  enableTenantRightJoin?: boolean;
  enableTenantFullJoin?: boolean;
  enableTenantCrossJoin?: boolean;
  enableTenantSelfJoin?: boolean;
  enableTenantEquiJoin?: boolean;
  enableTenantThetaJoin?: boolean;
  enableTenantSemiJoin?: boolean;
  enableTenantAntiJoin?: boolean;
  enableTenantOuterJoin?: boolean;
  enableTenantLeftOuterJoin?: boolean;
  enableTenantRightOuterJoin?: boolean;
  enableTenantFullOuterJoin?: boolean;
  enableTenantCrossOuterJoin?: boolean;
  enableTenantSelfOuterJoin?: boolean;
  enableTenantEquiOuterJoin?: boolean;
  enableTenantThetaOuterJoin?: boolean;
  enableTenantSemiOuterJoin?: boolean;
  enableTenantAntiOuterJoin?: boolean;
  customTenantChecks?: string[];
  tenantValidationRules?: string[];
  tenantSecurityPolicies?: string[];
  tenantAccessControls?: string[];
  tenantDataPolicies?: string[];
  tenantRetentionPolicies?: string[];
  tenantBackupPolicies?: string[];
  tenantRestorePolicies?: string[];
  tenantMigrationPolicies?: string[];
  tenantCloningPolicies?: string[];
  tenantArchivingPolicies?: string[];
  tenantDeletionPolicies?: string[];
  tenantSuspensionPolicies?: string[];
  tenantActivationPolicies?: string[];
  tenantConfigurationPolicies?: string[];
  tenantCustomizationPolicies?: string[];
  tenantIntegrationPolicies?: string[];
  tenantReportingPolicies?: string[];
  tenantAnalyticsPolicies?: string[];
  tenantMonitoringPolicies?: string[];
  tenantAlertingPolicies?: string[];
  tenantLoggingPolicies?: string[];
  tenantTracingPolicies?: string[];
  tenantProfilingPolicies?: string[];
  tenantOptimizationPolicies?: string[];
  tenantScalingPolicies?: string[];
  tenantLoadBalancingPolicies?: string[];
  tenantCachingPolicies?: string[];
  tenantCDNPolicies?: string[];
  tenantSSLPolicies?: string[];
  tenantEncryptionPolicies?: string[];
  tenantCompressionPolicies?: string[];
  tenantDeduplicationPolicies?: string[];
  tenantReplicationPolicies?: string[];
  tenantShardingPolicies?: string[];
  tenantPartitioningPolicies?: string[];
  tenantIndexingPolicies?: string[];
  tenantSearchPolicies?: string[];
  tenantFilteringPolicies?: string[];
  tenantSortingPolicies?: string[];
  tenantPaginationPolicies?: string[];
  tenantAggregationPolicies?: string[];
  tenantGroupingPolicies?: string[];
  tenantJoiningPolicies?: string[];
  tenantUnionPolicies?: string[];
  tenantIntersectionPolicies?: string[];
  tenantDifferencePolicies?: string[];
  tenantComplementPolicies?: string[];
  tenantSymmetricDifferencePolicies?: string[];
  tenantCartesianProductPolicies?: string[];
  tenantNaturalJoinPolicies?: string[];
  tenantInnerJoinPolicies?: string[];
  tenantLeftJoinPolicies?: string[];
  tenantRightJoinPolicies?: string[];
  tenantFullJoinPolicies?: string[];
  tenantCrossJoinPolicies?: string[];
  tenantSelfJoinPolicies?: string[];
  tenantEquiJoinPolicies?: string[];
  tenantThetaJoinPolicies?: string[];
  tenantSemiJoinPolicies?: string[];
  tenantAntiJoinPolicies?: string[];
  tenantOuterJoinPolicies?: string[];
  tenantLeftOuterJoinPolicies?: string[];
  tenantRightOuterJoinPolicies?: string[];
  tenantFullOuterJoinPolicies?: string[];
  tenantCrossOuterJoinPolicies?: string[];
  tenantSelfOuterJoinPolicies?: string[];
  tenantEquiOuterJoinPolicies?: string[];
  tenantThetaOuterJoinPolicies?: string[];
  tenantSemiOuterJoinPolicies?: string[];
  tenantAntiOuterJoinPolicies?: string[];
}

/**
 * Kapsamlı tenant decorator'ı
 */
export const Tenant = (options: TenantOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(TENANT_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(TENANT_OPTIONS_KEY, {
      requireTenantId: true,
      validateTenantAccess: true,
      enforceDataIsolation: true,
      enableTenantFiltering: true,
      enableTenantAuditing: true,
      enableTenantMetrics: true,
      enableTenantSecurity: true,
      enableTenantLogging: true,
      enableTenantMonitoring: true,
      enableTenantAnalytics: true,
      enableTenantReporting: true,
      enableTenantConfiguration: true,
      enableTenantCustomization: true,
      enableTenantIntegration: true,
      enableTenantBackup: true,
      enableTenantRestore: true,
      enableTenantMigration: true,
      enableTenantCloning: true,
      enableTenantArchiving: true,
      enableTenantDeletion: true,
      enableTenantSuspension: true,
      enableTenantActivation: true,
      enableTenantBilling: true,
      enableTenantQuotas: true,
      enableTenantAlerting: true,
      enableTenantTracing: true,
      enableTenantProfiling: true,
      enableTenantOptimization: true,
      enableTenantScaling: true,
      enableTenantLoadBalancing: true,
      enableTenantCaching: true,
      enableTenantCDN: true,
      enableTenantSSL: true,
      enableTenantEncryption: true,
      enableTenantCompression: true,
      enableTenantDeduplication: true,
      enableTenantReplication: true,
      enableTenantSharding: true,
      enableTenantPartitioning: true,
      enableTenantIndexing: true,
      enableTenantSearch: true,
      enableTenantFiltering: true,
      enableTenantSorting: true,
      enableTenantPagination: true,
      enableTenantAggregation: true,
      enableTenantGrouping: true,
      enableTenantJoining: true,
      enableTenantUnion: true,
      enableTenantIntersection: true,
      enableTenantDifference: true,
      enableTenantComplement: true,
      enableTenantSymmetricDifference: true,
      enableTenantCartesianProduct: true,
      enableTenantNaturalJoin: true,
      enableTenantInnerJoin: true,
      enableTenantLeftJoin: true,
      enableTenantRightJoin: true,
      enableTenantFullJoin: true,
      enableTenantCrossJoin: true,
      enableTenantSelfJoin: true,
      enableTenantEquiJoin: true,
      enableTenantThetaJoin: true,
      enableTenantSemiJoin: true,
      enableTenantAntiJoin: true,
      enableTenantOuterJoin: true,
      enableTenantLeftOuterJoin: true,
      enableTenantRightOuterJoin: true,
      enableTenantFullOuterJoin: true,
      enableTenantCrossOuterJoin: true,
      enableTenantSelfOuterJoin: true,
      enableTenantEquiOuterJoin: true,
      enableTenantThetaOuterJoin: true,
      enableTenantSemiOuterJoin: true,
      enableTenantAntiOuterJoin: true,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Önceden tanımlanmış tenant decorator'ları
 */
export const TenantBasic = () =>
  Tenant({ isolationLevel: 'basic', requireTenantId: true });

export const TenantStrict = () =>
  Tenant({ 
    isolationLevel: 'strict', 
    requireTenantId: true, 
    validateTenantAccess: true,
    enforceDataIsolation: true,
    enableTenantFiltering: true,
    enableTenantAuditing: true,
    enableTenantSecurity: true
  });

export const TenantCritical = () =>
  Tenant({ 
    isolationLevel: 'critical', 
    requireTenantId: true, 
    validateTenantAccess: true,
    enforceDataIsolation: true,
    enableTenantFiltering: true,
    enableTenantAuditing: true,
    enableTenantSecurity: true,
    enableTenantMonitoring: true,
    enableTenantAlerting: true,
    enableTenantLogging: true,
    enableTenantTracing: true,
    enableTenantProfiling: true
  });

export const TenantRequired = () =>
  Tenant({ 
    isolationLevel: 'strict', 
    requireTenantId: true, 
    validateTenantAccess: true,
    enforceDataIsolation: true
  });

export const TenantIsolated = () =>
  Tenant({ 
    isolationLevel: 'critical', 
    requireTenantId: true, 
    validateTenantAccess: true,
    enforceDataIsolation: true,
    enableTenantFiltering: true,
    enableTenantAuditing: true,
    enableTenantSecurity: true,
    enableTenantMonitoring: true,
    enableTenantAlerting: true,
    enableTenantLogging: true,
    enableTenantTracing: true,
    enableTenantProfiling: true,
    enableTenantOptimization: true,
    enableTenantScaling: true,
    enableTenantLoadBalancing: true,
    enableTenantCaching: true,
    enableTenantCDN: true,
    enableTenantSSL: true,
    enableTenantEncryption: true,
    enableTenantCompression: true,
    enableTenantDeduplication: true,
    enableTenantReplication: true,
    enableTenantSharding: true,
    enableTenantPartitioning: true,
    enableTenantIndexing: true,
    enableTenantSearch: true,
    enableTenantFiltering: true,
    enableTenantSorting: true,
    enableTenantPagination: true,
    enableTenantAggregation: true,
    enableTenantGrouping: true,
    enableTenantJoining: true,
    enableTenantUnion: true,
    enableTenantIntersection: true,
    enableTenantDifference: true,
    enableTenantComplement: true,
    enableTenantSymmetricDifference: true,
    enableTenantCartesianProduct: true,
    enableTenantNaturalJoin: true,
    enableTenantInnerJoin: true,
    enableTenantLeftJoin: true,
    enableTenantRightJoin: true,
    enableTenantFullJoin: true,
    enableTenantCrossJoin: true,
    enableTenantSelfJoin: true,
    enableTenantEquiJoin: true,
    enableTenantThetaJoin: true,
    enableTenantSemiJoin: true,
    enableTenantAntiJoin: true,
    enableTenantOuterJoin: true,
    enableTenantLeftOuterJoin: true,
    enableTenantRightOuterJoin: true,
    enableTenantFullOuterJoin: true,
    enableTenantCrossOuterJoin: true,
    enableTenantSelfOuterJoin: true,
    enableTenantEquiOuterJoin: true,
    enableTenantThetaOuterJoin: true,
    enableTenantSemiOuterJoin: true,
    enableTenantAntiOuterJoin: true
  });

export const TenantPublic = () =>
  Tenant({ isolationLevel: 'none', requireTenantId: false });

export const TenantSensitive = () =>
  Tenant({ 
    isolationLevel: 'critical', 
    requireTenantId: true, 
    validateTenantAccess: true,
    enforceDataIsolation: true,
    enableTenantFiltering: true,
    enableTenantAuditing: true,
    enableTenantSecurity: true,
    enableTenantMonitoring: true,
    enableTenantAlerting: true,
    enableTenantLogging: true,
    enableTenantTracing: true,
    enableTenantProfiling: true,
    enableTenantEncryption: true,
    enableTenantSSL: true
  });
