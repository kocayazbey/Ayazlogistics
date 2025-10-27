import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SloErrorBudgetService {
  private readonly logger = new Logger('SloErrorBudgetService');
  private readonly slos = new Map<string, any>();

  defineSlo(name: string, target: number, window: number): void {
    this.slos.set(name, {
      target,
      window,
      errors: 0,
      total: 0,
      startTime: Date.now()
    });
    this.logger.debug(`SLO defined: ${name} with target ${target}% over ${window}ms`);
  }

  recordRequest(sloName: string, success: boolean): void {
    const slo = this.slos.get(sloName);
    if (!slo) return;

    slo.total++;
    if (!success) {
      slo.errors++;
    }

    const errorRate = (slo.errors / slo.total) * 100;
    if (errorRate > slo.target) {
      this.logger.warn(`SLO ${sloName} error budget exceeded: ${errorRate}% > ${slo.target}%`);
    }
  }

  getSloStatus(sloName: string): any {
    const slo = this.slos.get(sloName);
    if (!slo) return null;

    const errorRate = (slo.errors / slo.total) * 100;
    return {
      name: sloName,
      target: slo.target,
      current: errorRate,
      withinBudget: errorRate <= slo.target,
      errors: slo.errors,
      total: slo.total
    };
  }
}
