import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiVersionService } from '../services/api-version.service';

@ApiTags('API Version')
@Controller('api/version')
export class ApiVersionController {
  constructor(private readonly apiVersionService: ApiVersionService) {}

  @Get()
  @ApiOperation({ summary: 'Get current API version information' })
  @ApiResponse({ status: 200, description: 'Current API version' })
  getCurrentVersion() {
    return {
      version: this.apiVersionService.getCurrentVersion(),
      supportedVersions: this.apiVersionService.getSupportedVersions(),
      deprecatedVersions: Array.from(this.apiVersionService['deprecatedVersions'].keys())
    };
  }

  @Get('supported')
  @ApiOperation({ summary: 'Get all supported API versions' })
  @ApiResponse({ status: 200, description: 'List of supported versions' })
  getSupportedVersions() {
    return {
      versions: this.apiVersionService.getSupportedVersions(),
      current: this.apiVersionService.getCurrentVersion()
    };
  }

  @Get('deprecated')
  @ApiOperation({ summary: 'Get deprecated API versions' })
  @ApiResponse({ status: 200, description: 'List of deprecated versions' })
  getDeprecatedVersions() {
    const deprecated = [];
    
    for (const version of this.apiVersionService.getSupportedVersions()) {
      if (this.apiVersionService.isVersionDeprecated(version)) {
        const info = this.apiVersionService.getVersionInfo(version);
        deprecated.push(info);
      }
    }
    
    return { deprecated };
  }

  @Get(':version')
  @ApiOperation({ summary: 'Get specific API version information' })
  @ApiResponse({ status: 200, description: 'Version information' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  getVersionInfo(@Param('version') version: string) {
    try {
      this.apiVersionService.validateVersion(version);
      
      const info = this.apiVersionService.getVersionInfo(version);
      const isDeprecated = this.apiVersionService.isVersionDeprecated(version);
      
      return {
        version,
        deprecated: isDeprecated,
        info: info || null,
        warning: isDeprecated ? this.apiVersionService.getDeprecationWarning(version) : null
      };
    } catch (error) {
      throw new HttpException(
        `Unsupported API version: ${version}`,
        HttpStatus.NOT_FOUND
      );
    }
  }
}
