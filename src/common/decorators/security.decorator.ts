import { SetMetadata } from '@nestjs/common';

export const SECURITY_KEY = 'security';
export const SECURITY_OPTIONS_KEY = 'security_options';

export interface SecurityOptions {
  level: 'basic' | 'moderate' | 'strict' | 'critical';
  requireHttps?: boolean;
  requireAuth?: boolean;
  requirePermissions?: string[];
  requireRoles?: string[];
  sanitizeInput?: boolean;
  validateInput?: boolean;
  encryptSensitive?: boolean;
  logSecurityEvents?: boolean;
  rateLimit?: boolean;
  csrfProtection?: boolean;
  xssProtection?: boolean;
  sqlInjectionProtection?: boolean;
  customSecurityChecks?: string[];
}

/**
 * Comprehensive security decorator
 */
export const Security = (options: SecurityOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(SECURITY_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(SECURITY_OPTIONS_KEY, {
      requireHttps: true,
      requireAuth: true,
      sanitizeInput: true,
      validateInput: true,
      logSecurityEvents: true,
      rateLimit: true,
      xssProtection: true,
      sqlInjectionProtection: true,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Predefined security decorators
 */
export const SecurityBasic = () =>
  Security({ level: 'basic', requireAuth: true });

export const SecurityModerate = () =>
  Security({ 
    level: 'moderate', 
    requireAuth: true, 
    sanitizeInput: true, 
    validateInput: true 
  });

export const SecurityStrict = () =>
  Security({ 
    level: 'strict', 
    requireAuth: true, 
    sanitizeInput: true, 
    validateInput: true,
    encryptSensitive: true,
    csrfProtection: true
  });

export const SecurityCritical = () =>
  Security({ 
    level: 'critical', 
    requireAuth: true, 
    sanitizeInput: true, 
    validateInput: true,
    encryptSensitive: true,
    csrfProtection: true,
    logSecurityEvents: true
  });

export const SecurityPublic = () =>
  Security({ 
    level: 'basic', 
    requireAuth: false, 
    rateLimit: true 
  });

export const SecuritySensitive = () =>
  Security({ 
    level: 'strict', 
    requireAuth: true, 
    sanitizeInput: true, 
    validateInput: true,
    encryptSensitive: true,
    logSecurityEvents: true
  });
