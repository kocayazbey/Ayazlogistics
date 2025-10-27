import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LighthouseCiService {
  private readonly logger = new Logger('LighthouseCiService');
  private readonly budgets = new Map<string, any>();

  setBudget(metric: string, budget: any): void {
    this.budgets.set(metric, budget);
    this.logger.debug(`Lighthouse budget set for ${metric}: ${budget}`);
  }

  async runLighthouseAudit(url: string): Promise<any> {
    this.logger.debug(`Running Lighthouse audit for ${url}`);
    
    // Simulate Lighthouse audit
    const audit = {
      url,
      timestamp: new Date().toISOString(),
      scores: {
        performance: Math.random() * 100,
        accessibility: Math.random() * 100,
        'best-practices': Math.random() * 100,
        seo: Math.random() * 100
      },
      metrics: {
        'first-contentful-paint': Math.random() * 3000,
        'largest-contentful-paint': Math.random() * 3000,
        'cumulative-layout-shift': Math.random() * 0.5,
        'total-blocking-time': Math.random() * 1000
      }
    };

    // Check against budgets
    const budgetResults = this.checkBudgets(audit);
    audit.budgetResults = budgetResults;

    this.logger.debug(`Lighthouse audit completed for ${url}`);
    return audit;
  }

  private checkBudgets(audit: any): any {
    const results = {};
    
    for (const [metric, budget] of this.budgets.entries()) {
      const currentValue = audit.scores[metric] || audit.metrics[metric];
      if (currentValue !== undefined) {
        results[metric] = {
          budget,
          current: currentValue,
          passed: currentValue >= budget
        };
      }
    }
    
    return results;
  }

  getAllBudgets(): Map<string, any> {
    return new Map(this.budgets);
  }
}
