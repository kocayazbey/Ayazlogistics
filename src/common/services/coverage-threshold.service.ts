import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CoverageThresholdService {
  private readonly logger = new Logger('CoverageThresholdService');
  private readonly thresholds = new Map<string, number>();

  setThreshold(metric: string, threshold: number): void {
    this.thresholds.set(metric, threshold);
    this.logger.debug(`Coverage threshold set for ${metric}: ${threshold}%`);
  }

  checkThreshold(metric: string, currentValue: number): boolean {
    const threshold = this.thresholds.get(metric);
    if (!threshold) return true;
    
    const passed = currentValue >= threshold;
    
    if (!passed) {
      this.logger.warn(`Coverage threshold not met for ${metric}: ${currentValue}% < ${threshold}%`);
    } else {
      this.logger.debug(`Coverage threshold met for ${metric}: ${currentValue}% >= ${threshold}%`);
    }
    
    return passed;
  }

  getAllThresholds(): Map<string, number> {
    return new Map(this.thresholds);
  }

  async runCoverageCheck(): Promise<{ passed: boolean; results: any[] }> {
    const results = [];
    let allPassed = true;
    
    // Check test coverage
    const testCoverage = await this.getTestCoverage();
    const testPassed = this.checkThreshold('test-coverage', testCoverage);
    results.push({ metric: 'test-coverage', value: testCoverage, passed: testPassed });
    if (!testPassed) allPassed = false;
    
    // Check code coverage
    const codeCoverage = await this.getCodeCoverage();
    const codePassed = this.checkThreshold('code-coverage', codeCoverage);
    results.push({ metric: 'code-coverage', value: codeCoverage, passed: codePassed });
    if (!codePassed) allPassed = false;
    
    // Check branch coverage
    const branchCoverage = await this.getBranchCoverage();
    const branchPassed = this.checkThreshold('branch-coverage', branchCoverage);
    results.push({ metric: 'branch-coverage', value: branchCoverage, passed: branchPassed });
    if (!branchPassed) allPassed = false;
    
    return { passed: allPassed, results };
  }

  private async getTestCoverage(): Promise<number> {
    // Simulate test coverage calculation
    return Math.random() * 100;
  }

  private async getCodeCoverage(): Promise<number> {
    // Simulate code coverage calculation
    return Math.random() * 100;
  }

  private async getBranchCoverage(): Promise<number> {
    // Simulate branch coverage calculation
    return Math.random() * 100;
  }
}
