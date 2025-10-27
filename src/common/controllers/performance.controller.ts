import { Controller, Get, Post, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { CacheService } from '../services/cache.service';
import { QueryOptimizerService } from '../services/query-optimizer.service';
import { N1QueryOptimizerService } from '../services/n1-query-optimizer.service';
import { BundleOptimizerService } from '../services/bundle-optimizer.service';

@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class PerformanceController {
  constructor(
    private performanceMonitorService: PerformanceMonitorService,
    private cacheService: CacheService,
    private queryOptimizerService: QueryOptimizerService,
    private n1QueryOptimizerService: N1QueryOptimizerService,
    private bundleOptimizerService: BundleOptimizerService
  ) {}

  @Get('stats')
  async getPerformanceStats(@Res() res: Response) {
    try {
      const stats = await this.performanceMonitorService.getPerformanceStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get performance stats' });
    }
  }

  @Get('slow-queries')
  async getSlowQueries(@Res() res: Response) {
    try {
      const slowQueries = await this.performanceMonitorService.getSlowQueries();
      res.json(slowQueries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get slow queries' });
    }
  }

  @Get('error-queries')
  async getErrorQueries(@Res() res: Response) {
    try {
      const errorQueries = await this.performanceMonitorService.getErrorQueries();
      res.json(errorQueries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get error queries' });
    }
  }

  @Get('system-metrics')
  async getSystemMetrics(@Res() res: Response) {
    try {
      const metrics = await this.performanceMonitorService.getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  }

  @Get('cache/stats')
  async getCacheStats(@Res() res: Response) {
    try {
      const stats = await this.cacheService.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get cache stats' });
    }
  }

  @Post('cache/clear')
  async clearCache(@Res() res: Response) {
    try {
      await this.cacheService.clear();
      res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }

  @Get('database/optimization-suggestions')
  async getDatabaseOptimizationSuggestions(@Res() res: Response) {
    try {
      const suggestions = await this.queryOptimizerService.getOptimizationSuggestions();
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get database optimization suggestions' });
    }
  }

  @Post('database/optimize')
  async optimizeDatabase(@Res() res: Response) {
    try {
      await this.queryOptimizerService.optimizeDatabase();
      res.json({ message: 'Database optimization completed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to optimize database' });
    }
  }

  @Get('database/query-performance')
  async getQueryPerformance(@Res() res: Response) {
    try {
      const performance = await this.queryOptimizerService.getQueryPerformance();
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get query performance' });
    }
  }

  @Get('database/slow-queries')
  async getDatabaseSlowQueries(@Res() res: Response) {
    try {
      const slowQueries = await this.queryOptimizerService.getSlowQueries();
      res.json(slowQueries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get database slow queries' });
    }
  }

  @Get('database/n1-queries')
  async getN1Queries(@Res() res: Response) {
    try {
      const n1Queries = await this.n1QueryOptimizerService.detectN1Queries();
      res.json(n1Queries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get N+1 queries' });
    }
  }

  @Post('database/optimize-n1')
  async optimizeN1Queries(@Res() res: Response) {
    try {
      const optimizations = await this.n1QueryOptimizerService.optimizeQueries();
      res.json({ message: 'N+1 query optimization completed', optimizations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to optimize N+1 queries' });
    }
  }

  @Get('bundle/stats')
  async getBundleStats(@Res() res: Response) {
    try {
      const stats = await this.bundleOptimizerService.analyzeBundle();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bundle stats' });
    }
  }

  @Get('bundle/optimization-suggestions')
  async getBundleOptimizationSuggestions(@Res() res: Response) {
    try {
      const suggestions = await this.bundleOptimizerService.getOptimizationSuggestions();
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bundle optimization suggestions' });
    }
  }

  @Post('bundle/optimize')
  async optimizeBundle(@Res() res: Response) {
    try {
      await this.bundleOptimizerService.optimizeBundle();
      res.json({ message: 'Bundle optimization completed' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to optimize bundle' });
    }
  }

  @Get('bundle/report')
  async getBundleReport(@Res() res: Response) {
    try {
      const report = await this.bundleOptimizerService.getBundleReport();
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bundle report' });
    }
  }

  @Get('metrics/export')
  async exportMetrics(@Res() res: Response) {
    try {
      const metrics = await this.performanceMonitorService.exportMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export metrics' });
    }
  }

  @Post('metrics/clear')
  async clearMetrics(@Res() res: Response) {
    try {
      await this.performanceMonitorService.clearMetrics();
      res.json({ message: 'Performance metrics cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear metrics' });
    }
  }
}
