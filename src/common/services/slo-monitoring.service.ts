import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SloMonitoringService {
  private readonly logger = new Logger('SloMonitoringService');
  private readonly slos = new Map<string, any>();

  defineSlo(name: string, target: number, window: number): void {
    this.slos.set(name, {
      target,
      window,
      errors: 0,
      total: 0,
      startTime: Date.now(),
      alerts: []
    });
    
    this.logger.debug(`SLO defined: ${name} with target ${target}% over ${window}ms`);
  }

  recordRequest(sloName: string, success: boolean, duration: number): void {
    const slo = this.slos.get(sloName);
    if (!slo) return;

    slo.total++;
    if (!success) {
      slo.errors++;
    }

    const errorRate = (slo.errors / slo.total) * 100;
    const remainingBudget = slo.target - errorRate;
    
    if (remainingBudget < 0) {
      this.logger.warn(`SLO ${sloName} error budget exceeded: ${errorRate}% > ${slo.target}%`);
      this.triggerAlert(sloName, 'error-budget-exceeded', { errorRate, target: slo.target });
    }
    
    if (duration > slo.target * 1000) { // Convert target to milliseconds
      this.logger.warn(`SLO ${sloName} latency exceeded: ${duration}ms > ${slo.target}s`);
      this.triggerAlert(sloName, 'latency-exceeded', { duration, target: slo.target });
    }
  }

  private triggerAlert(sloName: string, type: string, data: any): void {
    const slo = this.slos.get(sloName);
    if (!slo) return;

    const alert = {
      id: `alert-${Date.now()}`,
      sloName,
      type,
      data,
      timestamp: new Date().toISOString()
    };
    
    slo.alerts.push(alert);
    this.logger.error(`SLO Alert: ${sloName} - ${type}`, data);
  }

  getSloStatus(sloName: string): any {
    const slo = this.slos.get(sloName);
    if (!slo) return null;

    const errorRate = (slo.errors / slo.total) * 100;
    const remainingBudget = slo.target - errorRate;
    
    return {
      name: sloName,
      target: slo.target,
      current: errorRate,
      remainingBudget,
      withinBudget: remainingBudget >= 0,
      errors: slo.errors,
      total: slo.total,
      alerts: slo.alerts.slice(-10) // Last 10 alerts
    };
  }

  getAllSlos(): any[] {
    return Array.from(this.slos.keys()).map(name => this.getSloStatus(name));
  }
}
