import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiVersionService } from '../services/api-version.service';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  constructor(private readonly apiVersionService: ApiVersionService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const version = req.headers['api-version'] as string || 
                   req.query.version as string ||
                   this.extractVersionFromPath(req.path);

    if (version) {
      try {
        this.apiVersionService.validateVersion(version);
        
        // Add version info to request
        req['apiVersion'] = version;
        
        // Add deprecation warning to response headers
        const warning = this.apiVersionService.getDeprecationWarning(version);
        if (warning) {
          res.setHeader('Deprecation', 'true');
          res.setHeader('Sunset', this.apiVersionService.getVersionInfo(version)?.sunset || '');
          res.setHeader('Warning', `299 - "${warning}"`);
        }
        
        // Add version header to response
        res.setHeader('API-Version', version);
        res.setHeader('API-Version-Status', this.apiVersionService.getVersionHeader(version));
        
      } catch (error) {
        res.status(400).json({
          error: 'Invalid API Version',
          message: error.message,
          supportedVersions: this.apiVersionService.getSupportedVersions()
        });
        return;
      }
    } else {
      // Default to current version if no version specified
      req['apiVersion'] = this.apiVersionService.getCurrentVersion();
      res.setHeader('API-Version', this.apiVersionService.getCurrentVersion());
    }

    next();
  }

  private extractVersionFromPath(path: string): string | null {
    const versionMatch = path.match(/\/api\/v(\d+)\//);
    return versionMatch ? `v${versionMatch[1]}` : null;
  }
}
