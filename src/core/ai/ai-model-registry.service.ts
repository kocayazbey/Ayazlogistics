import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/database.provider';
import { sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { AIModelConfig, AITrainingJob, AIBusinessInsight } from './ai-ml-framework.service';

export interface AIModelEntity {
  id: string;
  name: string;
  type: string;
  algorithm: string;
  version: string;
  status: string;
  accuracy?: number;
  performance: {
    latency: number;
    throughput: number;
    memoryUsage: number;
  };
  endpoints: Record<string, string>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AITrainingJobEntity {
  id: string;
  modelId: string;
  status: string;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  dataset: Record<string, any>;
  hyperparameters: Record<string, any>;
  results?: Record<string, any>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIBusinessInsightEntity {
  id: string;
  type: string;
  confidence: number;
  impact: string;
  timeframe: string;
  data: Record<string, any>;
  recommendations: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AIModelRegistryService {
  private readonly logger = new Logger(AIModelRegistryService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private db: any,
    private configService: ConfigService,
  ) {}

  // Model Management
  async saveModel(model: AIModelConfig): Promise<void> {
    try {
      await this.db.execute(sql`
        INSERT INTO ai_models (
          id, name, type, algorithm, version, status, accuracy,
          performance, endpoints, metadata, created_at, updated_at
        ) VALUES (
          ${model.id}, ${model.name}, ${model.type}, ${model.algorithm},
          ${model.version}, ${model.status}, ${model.accuracy},
          ${JSON.stringify(model.performance)}, ${JSON.stringify(model.endpoints)},
          ${JSON.stringify(model.metadata)}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          algorithm = EXCLUDED.algorithm,
          version = EXCLUDED.version,
          status = EXCLUDED.status,
          accuracy = EXCLUDED.accuracy,
          performance = EXCLUDED.performance,
          endpoints = EXCLUDED.endpoints,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `);

      this.logger.log(`AI Model saved: ${model.id}`);
    } catch (error) {
      this.logger.error(`Error saving AI model: ${model.id}`, error);
      throw error;
    }
  }

  async getModel(modelId: string): Promise<AIModelEntity | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT * FROM ai_models WHERE id = ${modelId}
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return this.mapModelEntity(row);
    } catch (error) {
      this.logger.error(`Error getting AI model: ${modelId}`, error);
      throw error;
    }
  }

  async listModels(status?: string, type?: string): Promise<AIModelEntity[]> {
    try {
      let query = sql`SELECT * FROM ai_models WHERE 1=1`;
      const params: any[] = [];

      if (status) {
        query = sql`${query} AND status = ${status}`;
      }

      if (type) {
        query = sql`${query} AND type = ${type}`;
      }

      query = sql`${query} ORDER BY created_at DESC`;

      const result = await this.db.execute(query);

      return result.rows.map(row => this.mapModelEntity(row));
    } catch (error) {
      this.logger.error('Error listing AI models', error);
      throw error;
    }
  }

  async deleteModel(modelId: string): Promise<boolean> {
    try {
      const result = await this.db.execute(sql`
        DELETE FROM ai_models WHERE id = ${modelId}
      `);

      const success = result.rowCount > 0;
      if (success) {
        this.logger.log(`AI Model deleted: ${modelId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Error deleting AI model: ${modelId}`, error);
      throw error;
    }
  }

  // Training Job Management
  async saveTrainingJob(job: AITrainingJob): Promise<void> {
    try {
      await this.db.execute(sql`
        INSERT INTO ai_training_jobs (
          id, model_id, status, progress, started_at, completed_at,
          dataset, hyperparameters, results, error, created_at, updated_at
        ) VALUES (
          ${job.id}, ${job.modelId}, ${job.status}, ${job.progress},
          ${job.startedAt}, ${job.completedAt}, ${JSON.stringify(job.dataset)},
          ${JSON.stringify(job.hyperparameters)}, ${job.results ? JSON.stringify(job.results) : null},
          ${job.error}, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          progress = EXCLUDED.progress,
          completed_at = EXCLUDED.completed_at,
          results = EXCLUDED.results,
          error = EXCLUDED.error,
          updated_at = NOW()
      `);

      this.logger.log(`Training job saved: ${job.id}`);
    } catch (error) {
      this.logger.error(`Error saving training job: ${job.id}`, error);
      throw error;
    }
  }

  async getTrainingJob(jobId: string): Promise<AITrainingJobEntity | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT * FROM ai_training_jobs WHERE id = ${jobId}
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return this.mapTrainingJobEntity(row);
    } catch (error) {
      this.logger.error(`Error getting training job: ${jobId}`, error);
      throw error;
    }
  }

  async listTrainingJobs(modelId?: string): Promise<AITrainingJobEntity[]> {
    try {
      let query = sql`SELECT * FROM ai_training_jobs WHERE 1=1`;

      if (modelId) {
        query = sql`${query} AND model_id = ${modelId}`;
      }

      query = sql`${query} ORDER BY created_at DESC`;

      const result = await this.db.execute(query);

      return result.rows.map(row => this.mapTrainingJobEntity(row));
    } catch (error) {
      this.logger.error('Error listing training jobs', error);
      throw error;
    }
  }

  async cleanupOldTrainingJobs(olderThanDays: number = 30): Promise<number> {
    try {
      const result = await this.db.execute(sql`
        DELETE FROM ai_training_jobs
        WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
      `);

      const deletedCount = result.rowCount;
      this.logger.log(`Cleaned up ${deletedCount} old training jobs`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up old training jobs', error);
      throw error;
    }
  }

  // Business Insights Management
  async saveInsight(insight: AIBusinessInsight): Promise<void> {
    try {
      await this.db.execute(sql`
        INSERT INTO ai_business_insights (
          id, type, confidence, impact, timeframe, data,
          recommendations, expires_at, created_at, updated_at
        ) VALUES (
          ${insight.id}, ${insight.type}, ${insight.confidence},
          ${insight.impact}, ${insight.timeframe}, ${JSON.stringify(insight.data)},
          ${JSON.stringify(insight.recommendations)}, ${insight.expiresAt},
          NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          confidence = EXCLUDED.confidence,
          impact = EXCLUDED.impact,
          timeframe = EXCLUDED.timeframe,
          data = EXCLUDED.data,
          recommendations = EXCLUDED.recommendations,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `);

      this.logger.log(`Business insight saved: ${insight.id}`);
    } catch (error) {
      this.logger.error(`Error saving business insight: ${insight.id}`, error);
      throw error;
    }
  }

  async getInsight(insightId: string): Promise<AIBusinessInsightEntity | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT * FROM ai_business_insights WHERE id = ${insightId}
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return this.mapInsightEntity(row);
    } catch (error) {
      this.logger.error(`Error getting business insight: ${insightId}`, error);
      throw error;
    }
  }

  async listInsights(
    type?: string,
    impact?: string,
    limit: number = 50,
  ): Promise<AIBusinessInsightEntity[]> {
    try {
      let query = sql`SELECT * FROM ai_business_insights WHERE 1=1`;

      if (type) {
        query = sql`${query} AND type = ${type}`;
      }

      if (impact) {
        query = sql`${query} AND impact = ${impact}`;
      }

      query = sql`${query} AND (expires_at IS NULL OR expires_at > NOW())`;
      query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`;

      const result = await this.db.execute(query);

      return result.rows.map(row => this.mapInsightEntity(row));
    } catch (error) {
      this.logger.error('Error listing business insights', error);
      throw error;
    }
  }

  async cleanupExpiredInsights(): Promise<number> {
    try {
      const result = await this.db.execute(sql`
        DELETE FROM ai_business_insights WHERE expires_at < NOW()
      `);

      const deletedCount = result.rowCount;
      this.logger.log(`Cleaned up ${deletedCount} expired insights`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Error cleaning up expired insights', error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getModelAnalytics(): Promise<{
    totalModels: number;
    activeModels: number;
    trainingModels: number;
    deprecatedModels: number;
    averageAccuracy: number;
    modelsByType: Record<string, number>;
  }> {
    try {
      const result = await this.db.execute(sql`
        SELECT
          COUNT(*) as total_models,
          COUNT(*) FILTER (WHERE status = 'active') as active_models,
          COUNT(*) FILTER (WHERE status = 'training') as training_models,
          COUNT(*) FILTER (WHERE status = 'deprecated') as deprecated_models,
          AVG(accuracy) as average_accuracy,
          COUNT(*) FILTER (WHERE type = 'classification') as classification_models,
          COUNT(*) FILTER (WHERE type = 'regression') as regression_models,
          COUNT(*) FILTER (WHERE type = 'forecasting') as forecasting_models,
          COUNT(*) FILTER (WHERE type = 'optimization') as optimization_models,
          COUNT(*) FILTER (WHERE type = 'clustering') as clustering_models
        FROM ai_models
      `);

      const row = result.rows[0];

      return {
        totalModels: parseInt(row.total_models),
        activeModels: parseInt(row.active_models),
        trainingModels: parseInt(row.training_models),
        deprecatedModels: parseInt(row.deprecated_models),
        averageAccuracy: parseFloat(row.average_accuracy) || 0,
        modelsByType: {
          classification: parseInt(row.classification_models),
          regression: parseInt(row.regression_models),
          forecasting: parseInt(row.forecasting_models),
          optimization: parseInt(row.optimization_models),
          clustering: parseInt(row.clustering_models),
        },
      };
    } catch (error) {
      this.logger.error('Error getting model analytics', error);
      throw error;
    }
  }

  async getTrainingAnalytics(): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    averageTrainingTime: number;
    averageAccuracy: number;
  }> {
    try {
      const result = await this.db.execute(sql`
        SELECT
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_jobs,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as average_training_time,
          AVG((results->>'accuracy')::numeric) as average_accuracy
        FROM ai_training_jobs
        WHERE completed_at IS NOT NULL
      `);

      const row = result.rows[0];

      return {
        totalJobs: parseInt(row.total_jobs),
        successfulJobs: parseInt(row.successful_jobs),
        failedJobs: parseInt(row.failed_jobs),
        averageTrainingTime: parseFloat(row.average_training_time) || 0,
        averageAccuracy: parseFloat(row.average_accuracy) || 0,
      };
    } catch (error) {
      this.logger.error('Error getting training analytics', error);
      throw error;
    }
  }

  // Private mapping methods
  private mapModelEntity(row: any): AIModelEntity {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      algorithm: row.algorithm,
      version: row.version,
      status: row.status,
      accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
      performance: typeof row.performance === 'string' ? JSON.parse(row.performance) : row.performance,
      endpoints: typeof row.endpoints === 'string' ? JSON.parse(row.endpoints) : row.endpoints,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapTrainingJobEntity(row: any): AITrainingJobEntity {
    return {
      id: row.id,
      modelId: row.model_id,
      status: row.status,
      progress: parseInt(row.progress),
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      dataset: typeof row.dataset === 'string' ? JSON.parse(row.dataset) : row.dataset,
      hyperparameters: typeof row.hyperparameters === 'string' ? JSON.parse(row.hyperparameters) : row.hyperparameters,
      results: row.results ? (typeof row.results === 'string' ? JSON.parse(row.results) : row.results) : undefined,
      error: row.error,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapInsightEntity(row: any): AIBusinessInsightEntity {
    return {
      id: row.id,
      type: row.type,
      confidence: parseFloat(row.confidence),
      impact: row.impact,
      timeframe: row.timeframe,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      recommendations: typeof row.recommendations === 'string' ? JSON.parse(row.recommendations) : row.recommendations,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
