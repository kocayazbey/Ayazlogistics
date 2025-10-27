import { SetMetadata } from '@nestjs/common';

export const COMPREHENSIVE_AUDIT_METADATA = 'comprehensive_audit_metadata';

export interface ComprehensiveAuditOptions {
  action: string;
  resource: string;
  logChanges?: boolean;
  logMetadata?: boolean;
  sensitive?: boolean;
  trackPerformance?: boolean;
  trackSecurity?: boolean;
  trackBusiness?: boolean;
  trackTechnical?: boolean;
  trackUser?: boolean;
  trackSession?: boolean;
  trackAnalytics?: boolean;
  trackMonitoring?: boolean;
  trackHealth?: boolean;
  trackCache?: boolean;
  trackDatabase?: boolean;
  trackExternal?: boolean;
  trackQueue?: boolean;
  trackFile?: boolean;
  trackNetwork?: boolean;
  trackMemory?: boolean;
  trackCPU?: boolean;
  trackDisk?: boolean;
  trackUptime?: boolean;
  trackErrors?: boolean;
  trackWarnings?: boolean;
  trackInfo?: boolean;
  trackDebug?: boolean;
  trackVerbose?: boolean;
  trackAll?: boolean;
}

export const ComprehensiveAudit = (options: ComprehensiveAuditOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(COMPREHENSIVE_AUDIT_METADATA, {
      logChanges: true,
      logMetadata: true,
      sensitive: false,
      trackPerformance: true,
      trackSecurity: true,
      trackBusiness: true,
      trackTechnical: true,
      trackUser: true,
      trackSession: true,
      trackAnalytics: true,
      trackMonitoring: true,
      trackHealth: true,
      trackCache: true,
      trackDatabase: true,
      trackExternal: true,
      trackQueue: true,
      trackFile: true,
      trackNetwork: true,
      trackMemory: true,
      trackCPU: true,
      trackDisk: true,
      trackUptime: true,
      trackErrors: true,
      trackWarnings: true,
      trackInfo: true,
      trackDebug: true,
      trackVerbose: true,
      trackAll: true,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

export const ComprehensiveAuditCreate = (resource: string) =>
  ComprehensiveAudit({ action: 'CREATE', resource, logChanges: true, trackAll: true });

export const ComprehensiveAuditUpdate = (resource: string) =>
  ComprehensiveAudit({ action: 'UPDATE', resource, logChanges: true, trackAll: true });

export const ComprehensiveAuditDelete = (resource: string) =>
  ComprehensiveAudit({ action: 'DELETE', resource, logChanges: true, trackAll: true });

export const ComprehensiveAuditRead = (resource: string) =>
  ComprehensiveAudit({ action: 'READ', resource, logChanges: false, trackAll: true });

export const ComprehensiveAuditSensitive = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, logChanges: true, sensitive: true, trackAll: true });

export const ComprehensiveAuditPerformance = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackPerformance: true, trackAll: true });

export const ComprehensiveAuditSecurity = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackSecurity: true, trackAll: true });

export const ComprehensiveAuditBusiness = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackBusiness: true, trackAll: true });

export const ComprehensiveAuditTechnical = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackTechnical: true, trackAll: true });

export const ComprehensiveAuditUser = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackUser: true, trackAll: true });

export const ComprehensiveAuditSession = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackSession: true, trackAll: true });

export const ComprehensiveAuditAnalytics = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackAnalytics: true, trackAll: true });

export const ComprehensiveAuditMonitoring = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackMonitoring: true, trackAll: true });

export const ComprehensiveAuditHealth = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackHealth: true, trackAll: true });

export const ComprehensiveAuditCache = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackCache: true, trackAll: true });

export const ComprehensiveAuditDatabase = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackDatabase: true, trackAll: true });

export const ComprehensiveAuditExternal = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackExternal: true, trackAll: true });

export const ComprehensiveAuditQueue = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackQueue: true, trackAll: true });

export const ComprehensiveAuditFile = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackFile: true, trackAll: true });

export const ComprehensiveAuditNetwork = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackNetwork: true, trackAll: true });

export const ComprehensiveAuditMemory = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackMemory: true, trackAll: true });

export const ComprehensiveAuditCPU = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackCPU: true, trackAll: true });

export const ComprehensiveAuditDisk = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackDisk: true, trackAll: true });

export const ComprehensiveAuditUptime = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackUptime: true, trackAll: true });

export const ComprehensiveAuditErrors = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackErrors: true, trackAll: true });

export const ComprehensiveAuditWarnings = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackWarnings: true, trackAll: true });

export const ComprehensiveAuditInfo = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackInfo: true, trackAll: true });

export const ComprehensiveAuditDebug = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackDebug: true, trackAll: true });

export const ComprehensiveAuditVerbose = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackVerbose: true, trackAll: true });

export const ComprehensiveAuditAll = (action: string, resource: string) =>
  ComprehensiveAudit({ action, resource, trackAll: true });
