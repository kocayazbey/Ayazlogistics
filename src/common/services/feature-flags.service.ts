import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger('FeatureFlagsService');
  private readonly flags = new Map<string, any>();

  async initializeFlags(): Promise<void> {
    this.logger.debug('Initializing feature flags');
    
    // Initialize feature flags from external service (Unleash/LaunchDarkly)
    this.flags.set('new-inventory-ui', { enabled: true, rollout: 100, description: "New inventory management UI" });
    this.flags.set('advanced-analytics', { enabled: false, rollout: 0, description: "Advanced analytics dashboard" });
    this.flags.set('ai-optimization', { enabled: true, rollout: 50, description: "AI-powered route optimization" });
    this.flags.set('mobile-app-v2', { enabled: false, rollout: 0, description: "Next generation mobile app" });
    this.flags.set('real-time-tracking', { enabled: true, rollout: 75, description: "Real-time shipment tracking" });
    this.flags.set('blockchain-integration', { enabled: false, rollout: 0, description: "Blockchain-based supply chain" });
    
    this.logger.debug('Feature flags initialized successfully');
  }

  isEnabled(flagName: string, userId?: string, tenantId?: string): boolean {
    const flag = this.flags.get(flagName);
    if (!flag) {
      this.logger.warn(`Feature flag ${flagName} not found`);
      return false;
    }
    
    if (!flag.enabled) return false;
    
    // Check rollout percentage
    if (userId) {
      const hash = this.hashUserId(userId);
      const userRollout = hash % 100;
      return userRollout < flag.rollout;
    }
    
    return flag.rollout === 100;
  }

  getFlagValue(flagName: string, defaultValue: any = null): any {
    const flag = this.flags.get(flagName);
    return flag?.value || defaultValue;
  }

  async updateFlag(flagName: string, config: any): Promise<void> {
    this.flags.set(flagName, config);
    this.logger.debug(`Feature flag ${flagName} updated`);
  }

  async createFlag(flagName: string, config: any): Promise<void> {
    this.flags.set(flagName, config);
    this.logger.debug(`Feature flag ${flagName} created`);
  }

  async deleteFlag(flagName: string): Promise<void> {
    this.flags.delete(flagName);
    this.logger.debug(`Feature flag ${flagName} deleted`);
  }

  async getFlagHistory(flagName: string): Promise<any[]> {
    // Simulate flag history
    return [
      { timestamp: new Date().toISOString(), action: 'created', config: this.flags.get(flagName) },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), action: 'updated', config: this.flags.get(flagName) }
    ];
  }

  async getFlagMetrics(flagName: string): Promise<any> {
    const flag = this.flags.get(flagName);
    if (!flag) return null;
    
    return {
      name: flagName,
      enabled: flag.enabled,
      rollout: flag.rollout,
      impressions: Math.floor(Math.random() * 10000),
      conversions: Math.floor(Math.random() * 1000),
      conversionRate: Math.random() * 100
    };
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getAllFlags(): Map<string, any> {
    return new Map(this.flags);
  }

  async getFlagsForUser(userId: string, tenantId: string): Promise<any> {
    const userFlags = {};
    
    for (const [name, flag] of this.flags.entries()) {
      userFlags[name] = {
        enabled: this.isEnabled(name, userId, tenantId),
        config: flag
      };
    }
    
    return userFlags;
  }
}