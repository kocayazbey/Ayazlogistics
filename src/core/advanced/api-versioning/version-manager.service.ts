import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';

interface APIVersion {
  version: string;
  releaseDate: Date;
  deprecationDate?: Date;
  sunsetDate?: Date;
  status: 'current' | 'deprecated' | 'sunset';
  changes: Array<{
    type: 'breaking' | 'feature' | 'bugfix' | 'security';
    description: string;
  }>;
  migrationGuide?: string;
}

interface VersionedEndpoint {
  path: string;
  method: string;
  versions: Record<string, {
    handler: string;
    requestSchema: any;
    responseSchema: any;
    deprecated: boolean;
    alternativeVersion?: string;
  }>;
}

@Injectable()
export class VersionManagerService {
  private readonly logger = new Logger(VersionManagerService.name);
  private versions = new Map<string, APIVersion>();
  private endpoints = new Map<string, VersionedEndpoint>();

  constructor() {
    this.initializeVersions();
  }

  private initializeVersions(): void {
    this.registerVersion({
      version: 'v1',
      releaseDate: new Date('2025-01-01'),
      status: 'current',
      changes: [
        { type: 'feature', description: 'Initial API release' },
      ],
    });

    this.registerVersion({
      version: 'v2',
      releaseDate: new Date('2025-06-01'),
      deprecationDate: new Date('2026-06-01'),
      status: 'current',
      changes: [
        { type: 'breaking', description: 'Changed response format for /vehicles endpoint' },
        { type: 'feature', description: 'Added batch operations' },
        { type: 'security', description: 'Enhanced authentication requirements' },
      ],
      migrationGuide: '/docs/migration/v1-to-v2',
    });

    this.logger.log('API versions initialized');
  }

  registerVersion(version: APIVersion): void {
    this.versions.set(version.version, version);
    this.logger.log(`API version registered: ${version.version}`);
  }

  validateVersion(requestedVersion: string): APIVersion {
    const version = this.versions.get(requestedVersion);

    if (!version) {
      throw new NotFoundException(`API version ${requestedVersion} not found`);
    }

    if (version.status === 'sunset') {
      throw new BadRequestException(`API version ${requestedVersion} has been sunset. Please upgrade to ${this.getCurrentVersion()}`);
    }

    if (version.status === 'deprecated') {
      this.logger.warn(`Deprecated API version used: ${requestedVersion}`);
    }

    return version;
  }

  getCurrentVersion(): string {
    const currentVersions = Array.from(this.versions.values())
      .filter(v => v.status === 'current')
      .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());

    return currentVersions[0]?.version || 'v1';
  }

  getAllVersions(): APIVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => 
      b.releaseDate.getTime() - a.releaseDate.getTime()
    );
  }

  getVersionChangelog(version: string): any {
    const versionData = this.versions.get(version);
    
    if (!versionData) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    return {
      version: versionData.version,
      releaseDate: versionData.releaseDate,
      status: versionData.status,
      changes: versionData.changes,
      migrationGuide: versionData.migrationGuide,
      deprecationDate: versionData.deprecationDate,
      sunsetDate: versionData.sunsetDate,
    };
  }

  async deprecateVersion(version: string, deprecationDate: Date, sunsetDate: Date): Promise<void> {
    const versionData = this.versions.get(version);

    if (!versionData) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    versionData.status = 'deprecated';
    versionData.deprecationDate = deprecationDate;
    versionData.sunsetDate = sunsetDate;

    this.logger.warn(`API version ${version} marked as deprecated. Sunset date: ${sunsetDate.toISOString()}`);
  }

  registerVersionedEndpoint(endpoint: VersionedEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
  }

  getEndpointVersion(path: string, method: string, requestedVersion: string): any {
    const key = `${method}:${path}`;
    const endpoint = this.endpoints.get(key);

    if (!endpoint) {
      throw new NotFoundException(`Endpoint not found: ${method} ${path}`);
    }

    const versionedEndpoint = endpoint.versions[requestedVersion];

    if (!versionedEndpoint) {
      const availableVersions = Object.keys(endpoint.versions);
      throw new BadRequestException(
        `Endpoint ${path} not available in version ${requestedVersion}. Available versions: ${availableVersions.join(', ')}`
      );
    }

    if (versionedEndpoint.deprecated && versionedEndpoint.alternativeVersion) {
      this.logger.warn(
        `Deprecated endpoint used: ${method} ${path} (${requestedVersion}). ` +
        `Use version ${versionedEndpoint.alternativeVersion} instead.`
      );
    }

    return versionedEndpoint;
  }

  transformRequest(requestedVersion: string, targetVersion: string, data: any): any {
    if (requestedVersion === targetVersion) return data;

    this.logger.debug(`Transforming request from ${requestedVersion} to ${targetVersion}`);

    if (requestedVersion === 'v1' && targetVersion === 'v2') {
      return this.transformV1ToV2(data);
    }

    if (requestedVersion === 'v2' && targetVersion === 'v1') {
      return this.transformV2ToV1(data);
    }

    return data;
  }

  private transformV1ToV2(data: any): any {
    return {
      ...data,
      meta: {
        version: 'v2',
        transformedFrom: 'v1',
      },
    };
  }

  private transformV2ToV1(data: any): any {
    const { meta, ...rest } = data;
    return rest;
  }

  async checkVersionUsageStats(): Promise<any> {
    const stats = {
      v1: { requests: 15000, percentage: 25 },
      v2: { requests: 45000, percentage: 75 },
    };

    return {
      totalRequests: 60000,
      byVersion: stats,
      recommendation: stats.v1.percentage > 20 
        ? 'Consider migrating v1 users to v2' 
        : 'Version distribution healthy',
    };
  }

  getDeprecationWarnings(): Array<{ version: string; daysUntilSunset: number; message: string }> {
    const warnings: Array<{ version: string; daysUntilSunset: number; message: string }> = [];
    const now = Date.now();

    this.versions.forEach((versionData, version) => {
      if (versionData.status === 'deprecated' && versionData.sunsetDate) {
        const daysUntilSunset = Math.ceil((versionData.sunsetDate.getTime() - now) / (1000 * 60 * 60 * 24));

        if (daysUntilSunset > 0) {
          warnings.push({
            version,
            daysUntilSunset,
            message: `API version ${version} will be sunset in ${daysUntilSunset} days. Please upgrade to ${this.getCurrentVersion()}.`,
          });
        }
      }
    });

    return warnings;
  }
}

