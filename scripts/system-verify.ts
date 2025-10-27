#!/usr/bin/env ts-node
/**
 * AyazLogistics System Verification Script
 * Performs deep checks and tests real connections
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'postgres';
const postgres = pkg.default || pkg;
import Redis from 'ioredis';

interface VerificationResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface VerificationConfig {
  name: string;
  deepCheck: boolean;
  skipReports: boolean;
  confirmModules: boolean;
  testRealConnections: boolean;
}

class SystemVerifier {
  private results: VerificationResult[] = [];
  private config: VerificationConfig;

  constructor(config: VerificationConfig) {
    this.config = config;
  }

  async verify(): Promise<void> {
    console.log(`\n🔍 AyazLogistics System Verification`);
    console.log(`=====================================`);
    console.log(`System: ${this.config.name}`);
    console.log(`Deep Check: ${this.config.deepCheck}`);
    console.log(`Test Connections: ${this.config.testRealConnections}\n`);

    // Module verification
    if (this.config.confirmModules) {
      await this.verifyModules();
    }

    // Configuration verification
    await this.verifyConfiguration();

    // Dependency verification
    await this.verifyDependencies();

    // Database connection test
    if (this.config.testRealConnections) {
      await this.testDatabaseConnection();
    }

    // Redis connection test
    if (this.config.testRealConnections) {
      await this.testRedisConnection();
    }

    // File structure verification
    if (this.config.deepCheck) {
      await this.verifyFileStructure();
    }

    // Critical services verification
    if (this.config.deepCheck) {
      await this.verifyCriticalServices();
    }

    // Print results
    this.printResults();
  }

  private async verifyModules(): Promise<void> {
    console.log('📦 Verifying Modules...');
    
    const appModulePath = join(process.cwd(), 'src', 'app.module.ts');
    if (!existsSync(appModulePath)) {
      this.addResult('modules', 'fail', 'app.module.ts not found');
      return;
    }

    const appModuleContent = readFileSync(appModulePath, 'utf-8');
    const expectedModules = [
      'SecurityModule',
      'ObservabilityModule',
      'ResilienceModule',
      'TestingModule',
      'DataModule',
      'FeatureFlagsModule',
      'InfrastructureModule',
      'DevelopmentModule',
      'StatusModule',
      'TasksModule',
      'MobileModule',
      'AIModule',
      'DatabaseModule',
      'CacheModule',
      'ProductsModule',
      'OrdersModule',
      'CRMModule',
      'ERPModule',
      'WmsModule',
      'TmsModule',
      'MarketingModule',
      'ContentModule',
      'LotManagementModule',
      'WarehouseOperationsModule',
      'HandheldTerminalModule',
      'VehicleTrackingModule',
      'AccountingModule',
      'SupplierIntegrationModule',
      'PricingCampaignsModule',
    ];

    const missingModules: string[] = [];
    const foundModules: string[] = [];

    for (const module of expectedModules) {
      if (appModuleContent.includes(module)) {
        foundModules.push(module);
      } else {
        missingModules.push(module);
      }
    }

    if (missingModules.length === 0) {
      this.addResult('modules', 'pass', `All ${foundModules.length} modules found`, {
        modules: foundModules,
      });
    } else {
      this.addResult('modules', 'warning', `Missing ${missingModules.length} modules`, {
        found: foundModules.length,
        missing: missingModules,
      });
    }
  }

  private async verifyConfiguration(): Promise<void> {
    console.log('⚙️  Verifying Configuration...');

    const envExamplePath = join(process.cwd(), 'env.example');
    const envPath = join(process.cwd(), '.env');

    if (!existsSync(envExamplePath)) {
      this.addResult('config', 'fail', 'env.example not found');
    } else {
      this.addResult('config', 'pass', 'env.example exists');
    }

    if (!existsSync(envPath)) {
      this.addResult('config', 'warning', '.env file not found (using defaults)', {
        note: 'Create .env file from env.example for production',
      });
    } else {
      this.addResult('config', 'pass', '.env file exists');
    }

    // Check critical config files
    const configFiles = [
      'src/config/database.config.ts',
      'src/config/cache.config.ts',
      'drizzle.config.ts',
      'tsconfig.json',
      'package.json',
    ];

    for (const configFile of configFiles) {
      const filePath = join(process.cwd(), configFile);
      if (existsSync(filePath)) {
        this.addResult('config', 'pass', `${configFile} exists`);
      } else {
        this.addResult('config', 'fail', `${configFile} missing`);
      }
    }
  }

  private async verifyDependencies(): Promise<void> {
    console.log('📚 Verifying Dependencies...');

    const packageJsonPath = join(process.cwd(), 'package.json');
    if (!existsSync(packageJsonPath)) {
      this.addResult('dependencies', 'fail', 'package.json not found');
      return;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const criticalDeps = [
      '@nestjs/common',
      '@nestjs/core',
      'drizzle-orm',
      'postgres',
      'ioredis',
      'class-validator',
      'class-transformer',
    ];

    const missingDeps: string[] = [];
    const foundDeps: string[] = [];

    for (const dep of criticalDeps) {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        foundDeps.push(dep);
      } else {
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length === 0) {
      this.addResult('dependencies', 'pass', `All critical dependencies found`, {
        dependencies: foundDeps,
      });
    } else {
      this.addResult('dependencies', 'fail', `Missing dependencies: ${missingDeps.join(', ')}`);
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    console.log('🗄️  Testing Database Connection...');

    try {
      const host = process.env.DATABASE_HOST || 'localhost';
      const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
      const username = process.env.DATABASE_USERNAME || 'postgres';
      const password = process.env.DATABASE_PASSWORD || 'postgres';
      const database = process.env.DATABASE_NAME || 'ayazlogistics';

      const connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;

      const client = postgres(connectionString, {
        max: 1,
        connect_timeout: 5,
        idle_timeout: 5,
      });

      const startTime = Date.now();
      await client`SELECT 1`;
      const latency = Date.now() - startTime;

      // Get database version
      const [version] = await client`SELECT version()`;
      const dbVersion = version.version.split(' ')[0] + ' ' + version.version.split(' ')[1];

      await client.end();

      this.addResult('database', 'pass', `Database connection successful (${latency}ms)`, {
        host,
        port,
        database,
        version: dbVersion,
        latency: `${latency}ms`,
      });
    } catch (error: any) {
      this.addResult('database', 'fail', `Database connection failed: ${error.message}`, {
        error: error.message,
        note: 'Check DATABASE_HOST, DATABASE_PORT, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_NAME',
      });
    }
  }

  private async testRedisConnection(): Promise<void> {
    console.log('🔴 Testing Redis Connection...');

    let client: Redis | null = null;
    try {
      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD;

      client = new Redis({
        host,
        port,
        password,
        connectTimeout: 5000,
        lazyConnect: true,
        retryStrategy: () => null, // Disable retry
        maxRetriesPerRequest: 1,
      });

      // Handle error events silently
      client.on('error', () => {});

      const startTime = Date.now();
      await client.connect();
      await client.ping();
      const latency = Date.now() - startTime;

      const info = await client.info('server');
      const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';

      await client.quit();

      this.addResult('redis', 'pass', `Redis connection successful (${latency}ms)`, {
        host,
        port,
        version: redisVersion,
        latency: `${latency}ms`,
      });
    } catch (error: any) {
      this.addResult('redis', 'warning', `Redis connection failed: ${error.message}`, {
        error: error.message,
        note: 'Redis is optional for some features. Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD',
      });
    } finally {
      if (client) {
        try {
          await client.quit();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private async verifyFileStructure(): Promise<void> {
    console.log('📁 Verifying File Structure...');

    const criticalPaths = [
      'src/modules',
      'src/core',
      'src/common',
      'src/database',
      'src/config',
      'backend/src/modules',
      'frontend/admin-panel',
      'k8s',
      'docker-compose.yml',
      'Dockerfile',
    ];

    for (const path of criticalPaths) {
      const fullPath = join(process.cwd(), path);
      if (existsSync(fullPath)) {
        this.addResult('structure', 'pass', `${path} exists`);
      } else {
        this.addResult('structure', 'warning', `${path} not found`);
      }
    }
  }

  private async verifyCriticalServices(): Promise<void> {
    console.log('🔧 Verifying Critical Services...');

    const criticalServices = [
      'src/modules/auth/auth.service.ts',
      'src/database/database.provider.ts',
      'src/core/cache/redis.service.ts',
      'src/health/health.service.ts',
    ];

    for (const service of criticalServices) {
      const fullPath = join(process.cwd(), service);
      if (existsSync(fullPath)) {
        this.addResult('services', 'pass', `${service} exists`);
      } else {
        this.addResult('services', 'fail', `${service} missing`);
      }
    }
  }

  private addResult(check: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({ check, status, message, details });
  }

  private printResults(): void {
    console.log('\n📊 Verification Results');
    console.log('=====================================\n');

    const grouped = this.results.reduce((acc, result) => {
      if (!acc[result.check]) {
        acc[result.check] = [];
      }
      acc[result.check].push(result);
      return acc;
    }, {} as Record<string, VerificationResult[]>);

    let totalPass = 0;
    let totalFail = 0;
    let totalWarning = 0;

    for (const [category, results] of Object.entries(grouped)) {
      console.log(`\n${category.toUpperCase()}:`);
      console.log('-'.repeat(50));

      for (const result of results) {
        const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
        console.log(`${icon} ${result.message}`);

        if (result.details && this.config.deepCheck) {
          console.log(`   Details:`, JSON.stringify(result.details, null, 2));
        }

        if (result.status === 'pass') totalPass++;
        else if (result.status === 'fail') totalFail++;
        else totalWarning++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Summary:`);
    console.log(`  ✅ Passed: ${totalPass}`);
    console.log(`  ❌ Failed: ${totalFail}`);
    console.log(`  ⚠️  Warnings: ${totalWarning}`);
    console.log(`  📊 Total: ${this.results.length}`);

    const successRate = ((totalPass / this.results.length) * 100).toFixed(1);
    console.log(`\n🎯 Success Rate: ${successRate}%`);

    if (totalFail === 0 && totalWarning === 0) {
      console.log('\n✨ System verification completed successfully!');
    } else if (totalFail === 0) {
      console.log('\n⚠️  System verification completed with warnings.');
    } else {
      console.log('\n❌ System verification completed with failures. Please review the issues above.');
    }
  }
}

// Main execution
const config: VerificationConfig = {
  name: 'AyazLojistik',
  deepCheck: true,
  skipReports: true,
  confirmModules: true,
  testRealConnections: true,
};

const verifier = new SystemVerifier(config);
verifier.verify().catch((error) => {
  console.error('Verification error:', error);
  process.exit(1);
});

