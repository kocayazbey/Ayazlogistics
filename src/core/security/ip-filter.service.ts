import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface IPFilterRule {
  ip: string;
  type: 'whitelist' | 'blacklist';
  reason?: string;
  expiresAt?: Date;
  createdBy?: string;
}

@Injectable()
export class IPFilterService {
  private readonly logger = new Logger(IPFilterService.name);
  private redis: Redis;
  private whitelist: Set<string>;
  private blacklist: Set<string>;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 1),
    });

    this.whitelist = new Set();
    this.blacklist = new Set();
    this.loadFromConfig();
    this.loadFromRedis();
  }

  private loadFromConfig(): void {
    const whitelistStr = this.configService.get<string>('IP_WHITELIST', '');
    const blacklistStr = this.configService.get<string>('IP_BLACKLIST', '');

    if (whitelistStr) {
      whitelistStr.split(',').forEach((ip) => this.whitelist.add(ip.trim()));
    }

    if (blacklistStr) {
      blacklistStr.split(',').forEach((ip) => this.blacklist.add(ip.trim()));
    }

    this.logger.log(
      `Loaded ${this.whitelist.size} whitelisted and ${this.blacklist.size} blacklisted IPs from config`,
    );
  }

  private async loadFromRedis(): Promise<void> {
    try {
      const whitelistIPs = await this.redis.smembers('ip:whitelist');
      const blacklistIPs = await this.redis.smembers('ip:blacklist');

      whitelistIPs.forEach((ip) => this.whitelist.add(ip));
      blacklistIPs.forEach((ip) => this.blacklist.add(ip));

      this.logger.log(
        `Loaded ${whitelistIPs.length} whitelisted and ${blacklistIPs.length} blacklisted IPs from Redis`,
      );
    } catch (error) {
      this.logger.error('Failed to load IPs from Redis', error);
    }
  }

  async isAllowed(ip: string): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    // Check blacklist first
    if (this.blacklist.has(ip)) {
      const rule = await this.getRule(ip, 'blacklist');
      this.logger.warn(`Blocked IP attempt: ${ip} - ${rule?.reason || 'Blacklisted'}`);
      return {
        allowed: false,
        reason: rule?.reason || 'IP address is blacklisted',
      };
    }

    // If whitelist is not empty and IP is not in whitelist
    if (this.whitelist.size > 0 && !this.whitelist.has(ip)) {
      this.logger.warn(`Non-whitelisted IP attempt: ${ip}`);
      return {
        allowed: false,
        reason: 'IP address is not whitelisted',
      };
    }

    // Check for temporary blocks
    const tempBlock = await this.redis.get(`ip:tempblock:${ip}`);
    if (tempBlock) {
      return {
        allowed: false,
        reason: 'IP temporarily blocked due to suspicious activity',
      };
    }

    return { allowed: true };
  }

  async addToWhitelist(rule: IPFilterRule): Promise<void> {
    this.whitelist.add(rule.ip);
    await this.redis.sadd('ip:whitelist', rule.ip);
    await this.saveRule(rule);
    this.logger.log(`Added IP to whitelist: ${rule.ip}`);
  }

  async addToBlacklist(rule: IPFilterRule): Promise<void> {
    this.blacklist.add(rule.ip);
    await this.redis.sadd('ip:blacklist', rule.ip);
    await this.saveRule(rule);
    this.logger.log(`Added IP to blacklist: ${rule.ip} - ${rule.reason}`);
  }

  async removeFromWhitelist(ip: string): Promise<void> {
    this.whitelist.delete(ip);
    await this.redis.srem('ip:whitelist', ip);
    await this.redis.del(`ip:rule:whitelist:${ip}`);
    this.logger.log(`Removed IP from whitelist: ${ip}`);
  }

  async removeFromBlacklist(ip: string): Promise<void> {
    this.blacklist.delete(ip);
    await this.redis.srem('ip:blacklist', ip);
    await this.redis.del(`ip:rule:blacklist:${ip}`);
    this.logger.log(`Removed IP from blacklist: ${ip}`);
  }

  async tempBlock(
    ip: string,
    duration: number,
    reason: string,
  ): Promise<void> {
    await this.redis.setex(`ip:tempblock:${ip}`, duration, reason);
    this.logger.warn(`Temporarily blocked IP: ${ip} for ${duration}s - ${reason}`);
  }

  async trackSuspiciousActivity(ip: string): Promise<void> {
    const key = `ip:suspicious:${ip}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 hour window

    // Auto-block after 10 suspicious activities
    if (count >= 10) {
      await this.tempBlock(ip, 3600, 'Multiple suspicious activities detected');
    }
  }

  private async saveRule(rule: IPFilterRule): Promise<void> {
    const key = `ip:rule:${rule.type}:${rule.ip}`;
    await this.redis.set(
      key,
      JSON.stringify({
        ...rule,
        createdAt: new Date(),
      }),
    );

    if (rule.expiresAt) {
      const ttl = Math.floor(
        (rule.expiresAt.getTime() - Date.now()) / 1000,
      );
      if (ttl > 0) {
        await this.redis.expire(key, ttl);
      }
    }
  }

  private async getRule(
    ip: string,
    type: 'whitelist' | 'blacklist',
  ): Promise<IPFilterRule | null> {
    const key = `ip:rule:${type}:${ip}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getWhitelist(): Promise<IPFilterRule[]> {
    const ips = Array.from(this.whitelist);
    const rules = await Promise.all(
      ips.map((ip) => this.getRule(ip, 'whitelist')),
    );
    return rules.filter((r) => r !== null);
  }

  async getBlacklist(): Promise<IPFilterRule[]> {
    const ips = Array.from(this.blacklist);
    const rules = await Promise.all(
      ips.map((ip) => this.getRule(ip, 'blacklist')),
    );
    return rules.filter((r) => r !== null);
  }

  async getStats(): Promise<{
    whitelistCount: number;
    blacklistCount: number;
    tempBlockedCount: number;
  }> {
    const tempBlocked = await this.redis.keys('ip:tempblock:*');
    return {
      whitelistCount: this.whitelist.size,
      blacklistCount: this.blacklist.size,
      tempBlockedCount: tempBlocked.length,
    };
  }
}

