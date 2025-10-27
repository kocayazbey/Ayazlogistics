import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiVersionInfo {
  version: string;
  deprecated: boolean;
  since?: string;
  sunset?: string;
  migrationGuide?: string;
}

@Injectable()
export class ApiVersionService {
  private readonly supportedVersions: string[];
  private readonly currentVersion: string;
  private readonly deprecatedVersions: Map<string, ApiVersionInfo>;

  constructor(private configService: ConfigService) {
    this.currentVersion = this.configService.get<string>('API_CURRENT_VERSION', 'v1');
    this.supportedVersions = this.configService.get<string[]>('API_SUPPORTED_VERSIONS', ['v1']);
    
    this.deprecatedVersions = new Map([
      ['v0', {
        version: 'v0',
        deprecated: true,
        since: '2024-01-01',
        sunset: '2025-01-01',
        migrationGuide: 'https://docs.ayazlogistics.com/api/migration/v0-to-v1'
      }]
    ]);
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  getSupportedVersions(): string[] {
    return this.supportedVersions;
  }

  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  isVersionDeprecated(version: string): boolean {
    const versionInfo = this.deprecatedVersions.get(version);
    return versionInfo?.deprecated || false;
  }

  getVersionInfo(version: string): ApiVersionInfo | null {
    return this.deprecatedVersions.get(version) || null;
  }

  getDeprecationWarning(version: string): string | null {
    const versionInfo = this.getVersionInfo(version);
    
    if (!versionInfo || !versionInfo.deprecated) {
      return null;
    }

    let warning = `API version ${version} is deprecated`;
    
    if (versionInfo.since) {
      warning += ` since ${versionInfo.since}`;
    }
    
    if (versionInfo.sunset) {
      warning += ` and will be removed on ${versionInfo.sunset}`;
    }
    
    if (versionInfo.migrationGuide) {
      warning += `. Migration guide: ${versionInfo.migrationGuide}`;
    }
    
    return warning;
  }

  validateVersion(version: string): void {
    if (!this.isVersionSupported(version)) {
      throw new Error(`Unsupported API version: ${version}. Supported versions: ${this.supportedVersions.join(', ')}`);
    }
  }

  getVersionHeader(version: string): string {
    const warning = this.getDeprecationWarning(version);
    return warning ? `deprecated; ${warning}` : 'stable';
  }
}
