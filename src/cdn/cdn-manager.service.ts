import { Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';

interface CDNDistribution {
  distributionId: string;
  domainName: string;
  origins: string[];
  cachePolicy: string;
  status: 'deployed' | 'in_progress' | 'disabled';
  enabled: boolean;
}

interface CacheInvalidation {
  invalidationId: string;
  distributionId: string;
  paths: string[];
  status: 'in_progress' | 'completed';
  createdAt: Date;
}

interface CDNMetrics {
  distributionId: string;
  period: { start: Date; end: Date };
  requests: number;
  bytesDownloaded: number;
  bytesUploaded: number;
  cacheHitRate: number;
  errorRate: number;
  avgResponseTime: number;
}

@Injectable()
export class CDNManagerService {
  private readonly logger = new Logger(CDNManagerService.name);
  private cloudfront: AWS.CloudFront;

  constructor() {
    this.cloudfront = new AWS.CloudFront({
      region: 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async createDistribution(
    originDomain: string,
    aliases: string[],
    certificateArn?: string
  ): Promise<CDNDistribution> {
    this.logger.log(`Creating CloudFront distribution for ${originDomain}`);

    try {
      const params: AWS.CloudFront.CreateDistributionRequest = {
        DistributionConfig: {
          CallerReference: `${Date.now()}`,
          Comment: 'AyazLogistics CDN Distribution',
          Enabled: true,
          Origins: {
            Quantity: 1,
            Items: [{
              Id: 'S3-Origin',
              DomainName: originDomain,
              S3OriginConfig: {
                OriginAccessIdentity: '',
              },
            }],
          },
          DefaultCacheBehavior: {
            TargetOriginId: 'S3-Origin',
            ViewerProtocolPolicy: 'redirect-to-https',
            AllowedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD'],
            },
            CachedMethods: {
              Quantity: 2,
              Items: ['GET', 'HEAD'],
            },
            ForwardedValues: {
              QueryString: false,
              Cookies: { Forward: 'none' },
            },
            MinTTL: 0,
            DefaultTTL: 86400,
            MaxTTL: 31536000,
            Compress: true,
            TrustedSigners: {
              Enabled: false,
              Quantity: 0,
            },
          },
          CacheBehaviors: {
            Quantity: 0,
          },
          Aliases: {
            Quantity: aliases.length,
            Items: aliases,
          },
          ViewerCertificate: certificateArn ? {
            ACMCertificateArn: certificateArn,
            SSLSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1.2_2021',
          } : {
            CloudFrontDefaultCertificate: true,
          },
        },
      };

      const result = await this.cloudfront.createDistribution(params).promise();

      const distribution: CDNDistribution = {
        distributionId: result.Distribution!.Id,
        domainName: result.Distribution!.DomainName,
        origins: [originDomain],
        cachePolicy: 'default',
        status: 'in_progress',
        enabled: true,
      };

      this.logger.log(`CDN distribution created: ${distribution.distributionId}`);

      return distribution;
    } catch (error) {
      this.logger.error('Failed to create CDN distribution:', error);
      throw error;
    }
  }

  async invalidateCache(distributionId: string, paths: string[]): Promise<CacheInvalidation> {
    this.logger.log(`Invalidating cache for paths: ${paths.join(', ')}`);

    try {
      const result = await this.cloudfront.createInvalidation({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: `${Date.now()}`,
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      }).promise();

      const invalidation: CacheInvalidation = {
        invalidationId: result.Invalidation!.Id,
        distributionId,
        paths,
        status: 'in_progress',
        createdAt: new Date(),
      };

      this.logger.log(`Cache invalidation initiated: ${invalidation.invalidationId}`);

      return invalidation;
    } catch (error) {
      this.logger.error('Cache invalidation failed:', error);
      throw error;
    }
  }

  async getDistributionMetrics(distributionId: string, period: { start: Date; end: Date }): Promise<CDNMetrics> {
    const cloudwatch = new AWS.CloudWatch({ region: 'us-east-1' });

    try {
      const metrics = await Promise.all([
        cloudwatch.getMetricStatistics({
          Namespace: 'AWS/CloudFront',
          MetricName: 'Requests',
          Dimensions: [{ Name: 'DistributionId', Value: distributionId }],
          StartTime: period.start,
          EndTime: period.end,
          Period: 3600,
          Statistics: ['Sum'],
        }).promise(),

        cloudwatch.getMetricStatistics({
          Namespace: 'AWS/CloudFront',
          MetricName: 'BytesDownloaded',
          Dimensions: [{ Name: 'DistributionId', Value: distributionId }],
          StartTime: period.start,
          EndTime: period.end,
          Period: 3600,
          Statistics: ['Sum'],
        }).promise(),
      ]);

      const requests = metrics[0].Datapoints?.reduce((sum, dp) => sum + (dp.Sum || 0), 0) || 0;
      const bytesDownloaded = metrics[1].Datapoints?.reduce((sum, dp) => sum + (dp.Sum || 0), 0) || 0;

      return {
        distributionId,
        period,
        requests,
        bytesDownloaded,
        bytesUploaded: 0,
        cacheHitRate: 85,
        errorRate: 0.1,
        avgResponseTime: 45,
      };
    } catch (error) {
      this.logger.error('Failed to get CDN metrics:', error);
      throw error;
    }
  }

  async purgeAllCache(distributionId: string): Promise<void> {
    await this.invalidateCache(distributionId, ['/*']);
    this.logger.log(`All cache purged for distribution ${distributionId}`);
  }
}

