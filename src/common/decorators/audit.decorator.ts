import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_RESOURCE_KEY = 'audit_resource';
export const AUDIT_LEVEL_KEY = 'audit_level';

export enum AuditLevel {
  BASIC = 'basic',
  DETAILED = 'detailed',
  COMPREHENSIVE = 'comprehensive',
}

export interface AuditOptions {
  action: string;
  resource: string;
  level?: AuditLevel;
  sensitive?: boolean;
  trackChanges?: boolean;
  trackUser?: boolean;
  trackIp?: boolean;
  trackUserAgent?: boolean;
  trackRequestId?: boolean;
  customFields?: string[];
}

/**
 * Comprehensive audit decorator for tracking user actions
 */
export const Audit = (options: AuditOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(AUDIT_ACTION_KEY, options.action)(target, propertyKey, descriptor);
    SetMetadata(AUDIT_RESOURCE_KEY, options.resource)(target, propertyKey, descriptor);
    SetMetadata(AUDIT_LEVEL_KEY, options.level || AuditLevel.BASIC)(target, propertyKey, descriptor);
    return descriptor;
  };
};

/**
 * Quick audit decorators for common operations
 */
export const AuditCreate = (resource: string, level: AuditLevel = AuditLevel.DETAILED) =>
  Audit({ action: 'CREATE', resource, level, trackChanges: true });

export const AuditRead = (resource: string, level: AuditLevel = AuditLevel.BASIC) =>
  Audit({ action: 'READ', resource, level });

export const AuditUpdate = (resource: string, level: AuditLevel = AuditLevel.DETAILED) =>
  Audit({ action: 'UPDATE', resource, level, trackChanges: true });

export const AuditDelete = (resource: string, level: AuditLevel = AuditLevel.DETAILED) =>
  Audit({ action: 'DELETE', resource, level, trackChanges: true });

export const AuditLogin = (level: AuditLevel = AuditLevel.DETAILED) =>
  Audit({ action: 'LOGIN', resource: 'authentication', level, sensitive: true });

export const AuditLogout = (level: AuditLevel = AuditLevel.BASIC) =>
  Audit({ action: 'LOGOUT', resource: 'authentication', level });

export const AuditSensitive = (action: string, resource: string) =>
  Audit({ action, resource, level: AuditLevel.COMPREHENSIVE, sensitive: true, trackChanges: true });
