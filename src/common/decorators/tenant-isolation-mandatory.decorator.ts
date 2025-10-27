import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { TenantIsolationMandatoryGuard } from '../guards/tenant-isolation-mandatory.guard';

/**
 * Metadata key for tenant isolation requirements
 */
export const TENANT_ISOLATION_MANDATORY_KEY = 'tenant-isolation-mandatory';
export const TENANT_ISOLATION_EXEMPT_KEY = 'tenant-isolation-exempt';

/**
 * Interface for tenant isolation configuration
 */
export interface TenantIsolationConfig {
  /**
   * Whether tenant isolation is mandatory for this endpoint
   * @default true
   */
  mandatory: boolean;
  
  /**
   * Whether to validate tenant ID in request parameters
   * @default true
   */
  validateTenantId: boolean;
  
  /**
   * Whether to validate organization ID
   * @default false
   */
  validateOrganizationId: boolean;
  
  /**
   * Whether to log tenant isolation checks
   * @default true
   */
  enableLogging: boolean;
  
  /**
   * Custom error message for tenant isolation failures
   */
  customErrorMessage?: string;
}

/**
 * Default tenant isolation configuration
 */
export const DEFAULT_TENANT_ISOLATION_CONFIG: TenantIsolationConfig = {
  mandatory: true,
  validateTenantId: true,
  validateOrganizationId: false,
  enableLogging: true,
};

/**
 * Decorator to mark endpoints as requiring mandatory tenant isolation
 * This decorator should be applied to ALL controllers and routes
 * 
 * @param config - Optional configuration for tenant isolation
 * @returns Decorator function
 * 
 * @example
 * ```typescript
 * @Controller('users')
 * @TenantIsolationMandatory()
 * export class UsersController {
 *   @Get()
 *   @TenantIsolationMandatory()
 *   findAll() {
 *     // This endpoint requires tenant isolation
 *   }
 * }
 * ```
 */
export const TenantIsolationMandatory = (config?: Partial<TenantIsolationConfig>) => {
  const finalConfig = { ...DEFAULT_TENANT_ISOLATION_CONFIG, ...config };
  
  return applyDecorators(
    SetMetadata(TENANT_ISOLATION_MANDATORY_KEY, finalConfig),
    UseGuards(TenantIsolationMandatoryGuard)
  );
};

/**
 * Decorator to mark endpoints as exempt from tenant isolation
 * This should be used VERY sparingly and only for system-level operations
 * 
 * @returns Decorator function
 * 
 * @example
 * ```typescript
 * @Controller('system')
 * @TenantIsolationExempt()
 * export class SystemController {
 *   @Get('health')
 *   @TenantIsolationExempt()
 *   healthCheck() {
 *     // This endpoint is exempt from tenant isolation
 *   }
 * }
 * ```
 */
export const TenantIsolationExempt = () => {
  return SetMetadata(TENANT_ISOLATION_EXEMPT_KEY, true);
};

/**
 * Decorator for strict tenant isolation with additional validation
 * Use this for sensitive operations that require extra tenant validation
 * 
 * @param config - Configuration for strict tenant isolation
 * @returns Decorator function
 */
export const TenantIsolationStrict = (config?: Partial<TenantIsolationConfig>) => {
  const strictConfig: TenantIsolationConfig = {
    ...DEFAULT_TENANT_ISOLATION_CONFIG,
    validateTenantId: true,
    validateOrganizationId: true,
    enableLogging: true,
    customErrorMessage: 'Strict tenant isolation required for this operation',
    ...config,
  };
  
  return applyDecorators(
    SetMetadata(TENANT_ISOLATION_MANDATORY_KEY, strictConfig),
    UseGuards(TenantIsolationMandatoryGuard)
  );
};

/**
 * Decorator for tenant isolation with custom error message
 * 
 * @param errorMessage - Custom error message
 * @returns Decorator function
 */
export const TenantIsolationWithMessage = (errorMessage: string) => {
  const config: TenantIsolationConfig = {
    ...DEFAULT_TENANT_ISOLATION_CONFIG,
    customErrorMessage: errorMessage,
  };
  
  return applyDecorators(
    SetMetadata(TENANT_ISOLATION_MANDATORY_KEY, config),
    UseGuards(TenantIsolationMandatoryGuard)
  );
};

/**
 * Utility function to check if an endpoint is exempt from tenant isolation
 * 
 * @param target - The target class or method
 * @param propertyKey - The property key (for methods)
 * @returns True if the endpoint is exempt from tenant isolation
 */
export const isTenantIsolationExempt = (target: any, propertyKey?: string): boolean => {
  if (propertyKey) {
    return Reflect.getMetadata(TENANT_ISOLATION_EXEMPT_KEY, target, propertyKey) === true;
  }
  return Reflect.getMetadata(TENANT_ISOLATION_EXEMPT_KEY, target) === true;
};

/**
 * Utility function to get tenant isolation configuration for an endpoint
 * 
 * @param target - The target class or method
 * @param propertyKey - The property key (for methods)
 * @returns Tenant isolation configuration or null if not set
 */
export const getTenantIsolationConfig = (target: any, propertyKey?: string): TenantIsolationConfig | null => {
  if (propertyKey) {
    return Reflect.getMetadata(TENANT_ISOLATION_MANDATORY_KEY, target, propertyKey);
  }
  return Reflect.getMetadata(TENANT_ISOLATION_MANDATORY_KEY, target);
};
