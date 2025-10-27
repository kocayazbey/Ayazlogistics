import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class E2eStabilityService {
  private readonly logger = new Logger('E2eStabilityService');
  private readonly testResults = new Map<string, any>();

  async runStabilityTest(testName: string): Promise<any> {
    this.logger.debug(`Running E2E stability test: ${testName}`);
    
    const startTime = Date.now();
    const results = {
      testName,
      startTime: new Date().toISOString(),
      criticalFlows: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        flaky: 0
      }
    };

    // Test critical flows
    await this.testCriticalFlows(results);
    
    const endTime = Date.now();
    results.duration = endTime - startTime;
    results.endTime = new Date().toISOString();
    results.overallStability = this.calculateStability(results.summary);
    
    this.testResults.set(testName, results);
    this.logger.debug(`E2E stability test completed: ${testName}, stability: ${results.overallStability}%`);
    
    return results;
  }

  private async testCriticalFlows(results: any): Promise<void> {
    const criticalFlows = [
      { name: 'User Login', priority: 'critical' },
      { name: 'Inventory Management', priority: 'critical' },
      { name: 'Order Processing', priority: 'critical' },
      { name: 'Warehouse Operations', priority: 'high' },
      { name: 'Reporting', priority: 'medium' },
      { name: 'Mobile App', priority: 'high' },
      { name: 'API Integration', priority: 'critical' },
      { name: 'Error Handling', priority: 'medium' },
      { name: 'Performance', priority: 'high' }
    ];
    
    for (const flow of criticalFlows) {
      const testResult = await this.testFlow(flow);
      results.criticalFlows.push(testResult);
      
      results.summary.total++;
      if (testResult.status === 'passed') {
        results.summary.passed++;
      } else if (testResult.status === 'failed') {
        results.summary.failed++;
      } else if (testResult.status === 'flaky') {
        results.summary.flaky++;
      }
    }
  }

  private async testFlow(flow: any): Promise<any> {
    this.logger.debug(`Testing critical flow: ${flow.name}`);
    
    // Simulate flow testing
    const startTime = Date.now();
    const duration = Math.random() * 5000; // 0-5 seconds
    
    // Simulate test result
    const random = Math.random();
    let status, stability;
    
    if (random > 0.9) {
      status = 'failed';
      stability = 0;
    } else if (random > 0.7) {
      status = 'flaky';
      stability = Math.random() * 50 + 50; // 50-100%
    } else {
      status = 'passed';
      stability = Math.random() * 20 + 80; // 80-100%
    }
    
    const result = {
      name: flow.name,
      priority: flow.priority,
      status,
      stability,
      duration,
      timestamp: new Date().toISOString(),
      details: {
        steps: Math.floor(Math.random() * 10) + 5,
        assertions: Math.floor(Math.random() * 20) + 10,
        retries: status === 'flaky' ? Math.floor(Math.random() * 3) + 1 : 0
      }
    };
    
    this.logger.debug(`Flow ${flow.name} test result: ${status} (${stability}% stability)`);
    return result;
  }

  private calculateStability(summary: any): number {
    if (summary.total === 0) return 0;
    
    const stability = (summary.passed / summary.total) * 100;
    return Math.round(stability * 100) / 100; // Round to 2 decimal places
  }

  async getStabilityReport(testName?: string): Promise<any> {
    const results = testName ? this.testResults.get(testName) : Array.from(this.testResults.values());
    
    if (!results) {
      return { message: 'No test results found' };
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      results,
      recommendations: []
    };
    
    // Generate recommendations based on results
    if (Array.isArray(results)) {
      const overallStability = results.reduce((sum, result) => sum + result.overallStability, 0) / results.length;
      
      if (overallStability < 80) {
        report.recommendations.push('Overall stability is below 80%. Consider improving test reliability.');
      }
      
      const flakyTests = results.filter(result => result.summary.flaky > 0);
      if (flakyTests.length > 0) {
        report.recommendations.push('Some tests are flaky. Consider improving test stability.');
      }
    } else {
      if (results.overallStability < 80) {
        report.recommendations.push('Test stability is below 80%. Consider improving test reliability.');
      }
      
      if (results.summary.flaky > 0) {
        report.recommendations.push('Some tests are flaky. Consider improving test stability.');
      }
    }
    
    return report;
  }

  getTestResults(testName?: string): any {
    if (testName) {
      return this.testResults.get(testName);
    }
    return Array.from(this.testResults.values());
  }
}
