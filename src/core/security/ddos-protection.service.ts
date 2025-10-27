import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { Cache } from 'cache-manager';

interface TrafficPattern {
  ipAddress: string;
  requestCount: number;
  windowStart: Date;
  windowEnd: Date;
  endpoints: Record<string, number>;
  userAgents: string[];
  suspicious: boolean;
  score: number;
}

interface RateLimitRule {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  limit: number;
  window: number;
  burstSize: number;
  action: 'block' | 'throttle' | 'challenge' | 'log';
  priority: number;
  exemptIPs?: string[];
}

interface DDoSAttack {
  id: string;
  detectedAt: Date;
  attackType: 'volumetric' | 'protocol' | 'application' | 'slowloris' | 'http_flood';
  sourceIPs: string[];
  targetEndpoints: string[];
  requestsPerSecond: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationActions: string[];
  resolvedAt?: Date;
  duration?: number;
}

@Injectable()
export class DDoSProtectionService {
  private readonly logger = new Logger(DDoSProtectionService.name);
  private readonly BASELINE_RPS = 1000;
  private readonly SPIKE_THRESHOLD = 5;

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    @Inject('CACHE_MANAGER') private cacheManager: Cache,
  ) {}

  async analyzeTraffic(ipAddress: string, endpoint: string, userAgent: string): Promise<{ allowed: boolean; reason?: string }> {
    const key = `traffic:${ipAddress}`;
    const pattern = await this.cacheManager.get<TrafficPattern>(key);

    const now = new Date();

    if (!pattern) {
      await this.cacheManager.set(key, {
        ipAddress,
        requestCount: 1,
        windowStart: now,
        windowEnd: new Date(now.getTime() + 60000),
        endpoints: { [endpoint]: 1 },
        userAgents: [userAgent],
        suspicious: false,
        score: 0,
      }, 60);

      return { allowed: true };
    }

    pattern.requestCount++;
    pattern.endpoints[endpoint] = (pattern.endpoints[endpoint] || 0) + 1;
    
    if (!pattern.userAgents.includes(userAgent)) {
      pattern.userAgents.push(userAgent);
    }

    const rps = pattern.requestCount / ((now.getTime() - pattern.windowStart.getTime()) / 1000);

    if (rps > 100) {
      pattern.suspicious = true;
      pattern.score += 30;
    }

    if (pattern.userAgents.length > 5) {
      pattern.suspicious = true;
      pattern.score += 20;
    }

    if (Object.keys(pattern.endpoints).length === 1 && pattern.requestCount > 50) {
      pattern.suspicious = true;
      pattern.score += 25;
    }

    await this.cacheManager.set(key, pattern, 60);

    if (pattern.score > 50) {
      await this.blockIP(ipAddress, 'Suspicious traffic pattern detected', 3600);
      return { allowed: false, reason: 'Traffic pattern indicates potential attack' };
    }

    if (rps > 200) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }

    return { allowed: true };
  }

  async detectDDoS(): Promise<DDoSAttack | null> {
    const currentRPS = await this.getCurrentRPS();

    if (currentRPS > this.BASELINE_RPS * this.SPIKE_THRESHOLD) {
      const topIPs = await this.getTopRequestIPs(100);
      const topEndpoints = await this.getTopRequestEndpoints(10);

      const attack: DDoSAttack = {
        id: `attack_${Date.now()}`,
        detectedAt: new Date(),
        attackType: this.classifyAttackType(topEndpoints, currentRPS),
        sourceIPs: topIPs.map(ip => ip.address),
        targetEndpoints: topEndpoints.map(e => e.endpoint),
        requestsPerSecond: currentRPS,
        severity: currentRPS > this.BASELINE_RPS * 10 ? 'critical' : currentRPS > this.BASELINE_RPS * 7 ? 'high' : 'medium',
        mitigationActions: [],
      };

      await this.triggerMitigation(attack);

      await this.db.execute(
        `INSERT INTO ddos_attacks 
         (id, detected_at, attack_type, source_ips, target_endpoints, requests_per_second, severity, mitigation_actions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          attack.id,
          attack.detectedAt,
          attack.attackType,
          JSON.stringify(attack.sourceIPs),
          JSON.stringify(attack.targetEndpoints),
          attack.requestsPerSecond,
          attack.severity,
          JSON.stringify(attack.mitigationActions),
        ]
      );

      this.logger.error(`DDoS ATTACK DETECTED: ${attack.attackType} - ${currentRPS} req/s`);

      return attack;
    }

    return null;
  }

  private async getCurrentRPS(): Promise<number> {
    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM request_logs 
       WHERE created_at > NOW() - INTERVAL '10 seconds'`
    );

    return parseInt(result.rows[0]?.count || '0') / 10;
  }

  private async getTopRequestIPs(limit: number): Promise<Array<{ address: string; count: number }>> {
    const result = await this.db.execute(
      `SELECT ip_address, COUNT(*) as count
       FROM request_logs
       WHERE created_at > NOW() - INTERVAL '5 minutes'
       GROUP BY ip_address
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      address: row.ip_address,
      count: parseInt(row.count),
    }));
  }

  private async getTopRequestEndpoints(limit: number): Promise<Array<{ endpoint: string; count: number }>> {
    const result = await this.db.execute(
      `SELECT endpoint, COUNT(*) as count
       FROM request_logs
       WHERE created_at > NOW() - INTERVAL '5 minutes'
       GROUP BY endpoint
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(row => ({
      endpoint: row.endpoint,
      count: parseInt(row.count),
    }));
  }

  private classifyAttackType(endpoints: any[], rps: number): DDoSAttack['attackType'] {
    if (endpoints.length === 1) {
      return 'application';
    }

    if (rps > 50000) {
      return 'volumetric';
    }

    return 'http_flood';
  }

  private async triggerMitigation(attack: DDoSAttack): Promise<void> {
    attack.mitigationActions = [];

    if (attack.severity === 'critical' || attack.severity === 'high') {
      for (const ip of attack.sourceIPs.slice(0, 50)) {
        await this.blockIP(ip, `DDoS attack ${attack.id}`, 7200);
        attack.mitigationActions.push(`Blocked IP: ${ip}`);
      }
    }

    await this.enableRateLimiting(attack.targetEndpoints, 10, 60);
    attack.mitigationActions.push('Strict rate limiting enabled');

    if (attack.severity === 'critical') {
      await this.enableChallengeMode();
      attack.mitigationActions.push('Challenge mode activated');
    }

    this.logger.log(`Mitigation triggered: ${attack.mitigationActions.length} actions`);
  }

  private async blockIP(ipAddress: string, reason: string, durationSeconds: number): Promise<void> {
    await this.db.execute(
      `INSERT INTO blocked_ips (ip_address, reason, blocked_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '${durationSeconds} seconds')
       ON CONFLICT (ip_address) DO UPDATE SET
         reason = $2,
         blocked_at = NOW(),
         expires_at = NOW() + INTERVAL '${durationSeconds} seconds'`,
      [ipAddress, reason]
    );

    await this.cacheManager.set(`blocked:${ipAddress}`, true, durationSeconds);

    this.logger.warn(`IP blocked: ${ipAddress} for ${durationSeconds}s - ${reason}`);
  }

  async isIPBlocked(ipAddress: string): Promise<boolean> {
    const cached = await this.cacheManager.get(`blocked:${ipAddress}`);
    if (cached) return true;

    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM blocked_ips 
       WHERE ip_address = $1 AND expires_at > NOW()`,
      [ipAddress]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  private async enableRateLimiting(endpoints: string[], limit: number, windowSeconds: number): Promise<void> {
    for (const endpoint of endpoints) {
      await this.cacheManager.set(`ratelimit:${endpoint}`, { limit, window: windowSeconds }, windowSeconds);
    }

    this.logger.log(`Rate limiting enabled for ${endpoints.length} endpoints: ${limit} req/${windowSeconds}s`);
  }

  private async enableChallengeMode(): Promise<void> {
    await this.db.execute(
      `UPDATE system_settings SET value = 'true' WHERE key = 'challenge_mode_enabled'`
    );

    this.logger.warn('CHALLENGE MODE ACTIVATED - All requests require CAPTCHA');
  }

  async getAttackHistory(days: number = 30): Promise<DDoSAttack[]> {
    const result = await this.db.execute(
      `SELECT * FROM ddos_attacks 
       WHERE detected_at > NOW() - INTERVAL '${days} days'
       ORDER BY detected_at DESC`
    );

    return result.rows.map(row => ({
      id: row.id,
      detectedAt: new Date(row.detected_at),
      attackType: row.attack_type,
      sourceIPs: JSON.parse(row.source_ips || '[]'),
      targetEndpoints: JSON.parse(row.target_endpoints || '[]'),
      requestsPerSecond: parseFloat(row.requests_per_second),
      severity: row.severity,
      mitigationActions: JSON.parse(row.mitigation_actions || '[]'),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      duration: row.duration,
    }));
  }

  async whitelistIP(ipAddress: string, reason: string): Promise<void> {
    await this.db.execute(
      `INSERT INTO whitelisted_ips (ip_address, reason, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (ip_address) DO NOTHING`,
      [ipAddress, reason]
    );

    await this.cacheManager.set(`whitelist:${ipAddress}`, true, 0);

    this.logger.log(`IP whitelisted: ${ipAddress} - ${reason}`);
  }
}

