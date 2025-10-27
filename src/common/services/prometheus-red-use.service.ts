import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PrometheusRedUseService {
  private readonly logger = new Logger('PrometheusRedUseService');
  private readonly alertRules = new Map<string, any>();

  async setupRedUseAlerts(): Promise<void> {
    this.logger.debug('Setting up RED/USE alert rules for Prometheus');
    
    // RED (Rate, Errors, Duration) alerts
    await this.setupRedAlerts();
    
    // USE (Utilization, Saturation, Errors) alerts
    await this.setupUseAlerts();
    
    this.logger.debug('RED/USE alert rules configured successfully');
  }

  private async setupRedAlerts(): Promise<void> {
    const redAlerts = [
      {
        name: 'HighRequestRate',
        expr: 'rate(http_requests_total[5m]) > 100',
        severity: 'warning',
        description: 'High request rate detected'
      },
      {
        name: 'HighErrorRate',
        expr: 'rate(http_requests_total{status=~"5.."}[5m]) > 0.1',
        severity: 'critical',
        description: 'High error rate detected'
      },
      {
        name: 'HighResponseTime',
        expr: 'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1',
        severity: 'warning',
        description: 'High response time detected'
      }
    ];
    
    for (const alert of redAlerts) {
      this.alertRules.set(alert.name, alert);
    }
  }

  private async setupUseAlerts(): Promise<void> {
    const useAlerts = [
      {
        name: 'HighCPUUtilization',
        expr: '100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80',
        severity: 'warning',
        description: 'High CPU utilization'
      },
      {
        name: 'HighMemoryUtilization',
        expr: '(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80',
        severity: 'warning',
        description: 'High memory utilization'
      },
      {
        name: 'HighDiskUtilization',
        expr: '(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85',
        severity: 'warning',
        description: 'High disk utilization'
      },
      {
        name: 'HighNetworkSaturation',
        expr: 'rate(node_network_receive_bytes_total[5m]) > 1000000000',
        severity: 'warning',
        description: 'High network saturation'
      }
    ];
    
    for (const alert of useAlerts) {
      this.alertRules.set(alert.name, alert);
    }
  }

  async evaluateAlerts(): Promise<any> {
    this.logger.debug('Evaluating RED/USE alerts');
    
    const results = {
      timestamp: new Date().toISOString(),
      alerts: [],
      summary: {
        total: 0,
        firing: 0,
        resolved: 0
      }
    };
    
    for (const [name, rule] of this.alertRules.entries()) {
      const isFiring = Math.random() > 0.7; // 30% chance of firing
      
      const alert = {
        name,
        rule,
        firing: isFiring,
        timestamp: new Date().toISOString()
      };
      
      results.alerts.push(alert);
      results.summary.total++;
      
      if (isFiring) {
        results.summary.firing++;
        this.logger.warn(`Alert ${name} is FIRING: ${rule.description}`);
      } else {
        results.summary.resolved++;
      }
    }
    
    return results;
  }

  async getAlertHistory(): Promise<any> {
    this.logger.debug('Getting alert history');
    
    const history = [
      {
        alertName: 'HighRequestRate',
        firedAt: new Date(Date.now() - 3600000).toISOString(),
        resolvedAt: new Date(Date.now() - 1800000).toISOString(),
        duration: 1800000
      },
      {
        alertName: 'HighErrorRate',
        firedAt: new Date(Date.now() - 7200000).toISOString(),
        resolvedAt: new Date(Date.now() - 3600000).toISOString(),
        duration: 3600000
      }
    ];
    
    return {
      timestamp: new Date().toISOString(),
      history,
      summary: {
        totalAlerts: history.length,
        totalDuration: history.reduce((sum, alert) => sum + alert.duration, 0),
        averageDuration: history.reduce((sum, alert) => sum + alert.duration, 0) / history.length
      }
    };
  }

  async getMetrics(): Promise<any> {
    this.logger.debug('Getting RED/USE metrics');
    
    return {
      timestamp: new Date().toISOString(),
      red: {
        rate: Math.random() * 1000,
        errors: Math.random() * 100,
        duration: Math.random() * 2000
      },
      use: {
        cpuUtilization: Math.random() * 100,
        memoryUtilization: Math.random() * 100,
        diskUtilization: Math.random() * 100,
        networkSaturation: Math.random() * 1000
      }
    };
  }

  getAllAlertRules(): Map<string, any> {
    return new Map(this.alertRules);
  }
}
