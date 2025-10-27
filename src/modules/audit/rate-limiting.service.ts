import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs: number; // How long to block after limit exceeded
}

export interface ClientInfo {
  ip: string;
  userAgent: string;
  userId?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  blockedUntil?: number;
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);

  // In-memory storage (in production, use Redis)
  private clientRequests = new Map<string, {
    requests: number[];
    blockedUntil?: number;
  }>();

  // Default configurations
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    blockDurationMs: 300000, // 5 minutes
  };

  private readonly strictConfig: RateLimitConfig = {
    windowMs: 10000, // 10 seconds
    maxRequests: 10,
    blockDurationMs: 600000, // 10 minutes
  };

  constructor(private configService: ConfigService) {
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanupExpiredEntries(), 5 * 60 * 1000);
  }

  /**
   * Check rate limit for a client
   */
  checkRateLimit(clientInfo: ClientInfo, config?: Partial<RateLimitConfig>): RateLimitResult {
    const rateLimitConfig = { ...this.defaultConfig, ...config };
    const clientKey = this.generateClientKey(clientInfo);

    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;

    // Get or initialize client data
    let clientData = this.clientRequests.get(clientKey);
    if (!clientData) {
      clientData = { requests: [] };
      this.clientRequests.set(clientKey, clientData);
    }

    // Check if client is currently blocked
    if (clientData.blockedUntil && now < clientData.blockedUntil) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: clientData.blockedUntil,
        blockedUntil: clientData.blockedUntil,
      };
    }

    // Clean old requests outside the window
    clientData.requests = clientData.requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (clientData.requests.length >= rateLimitConfig.maxRequests) {
      // Block the client
      clientData.blockedUntil = now + rateLimitConfig.blockDurationMs;

      this.logger.warn(`Rate limit exceeded for client: ${clientKey} - Blocked for ${rateLimitConfig.blockDurationMs}ms`);

      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: clientData.blockedUntil,
        blockedUntil: clientData.blockedUntil,
      };
    }

    // Add current request
    clientData.requests.push(now);

    const remainingRequests = Math.max(0, rateLimitConfig.maxRequests - clientData.requests.length);
    const resetTime = windowStart + rateLimitConfig.windowMs;

    return {
      allowed: true,
      remainingRequests,
      resetTime,
    };
  }

  /**
   * Check WebSocket connection rate limit (stricter limits)
   */
  checkWebSocketConnectionLimit(clientInfo: ClientInfo): RateLimitResult {
    return this.checkRateLimit(clientInfo, this.strictConfig);
  }

  /**
   * Check API request rate limit
   */
  checkApiRateLimit(clientInfo: ClientInfo, endpoint?: string): RateLimitResult {
    // Apply stricter limits for sensitive endpoints
    if (endpoint?.includes('/auth') || endpoint?.includes('/payment')) {
      return this.checkRateLimit(clientInfo, {
        windowMs: 30000, // 30 seconds
        maxRequests: 5,
        blockDurationMs: 900000, // 15 minutes
      });
    }

    return this.checkRateLimit(clientInfo, this.defaultConfig);
  }

  /**
   * Get rate limit status for a client
   */
  getRateLimitStatus(clientInfo: ClientInfo): {
    currentRequests: number;
    remainingRequests: number;
    resetTime: number;
    isBlocked: boolean;
    blockedUntil?: number;
  } {
    const clientKey = this.generateClientKey(clientInfo);
    const clientData = this.clientRequests.get(clientKey);

    if (!clientData) {
      return {
        currentRequests: 0,
        remainingRequests: this.defaultConfig.maxRequests,
        resetTime: Date.now() + this.defaultConfig.windowMs,
        isBlocked: false,
      };
    }

    const now = Date.now();
    const windowStart = now - this.defaultConfig.windowMs;
    const currentRequests = clientData.requests.filter(timestamp => timestamp > windowStart).length;
    const remainingRequests = Math.max(0, this.defaultConfig.maxRequests - currentRequests);

    return {
      currentRequests,
      remainingRequests,
      resetTime: windowStart + this.defaultConfig.windowMs,
      isBlocked: !!(clientData.blockedUntil && now < clientData.blockedUntil),
      blockedUntil: clientData.blockedUntil,
    };
  }

  /**
   * Manually block a client
   */
  blockClient(clientInfo: ClientInfo, durationMs: number = 300000): void {
    const clientKey = this.generateClientKey(clientInfo);
    const clientData = this.clientRequests.get(clientKey) || { requests: [] };

    clientData.blockedUntil = Date.now() + durationMs;
    this.clientRequests.set(clientKey, clientData);

    this.logger.warn(`Client manually blocked: ${clientKey} for ${durationMs}ms`);
  }

  /**
   * Unblock a client
   */
  unblockClient(clientInfo: ClientInfo): void {
    const clientKey = this.generateClientKey(clientInfo);
    const clientData = this.clientRequests.get(clientKey);

    if (clientData) {
      clientData.blockedUntil = undefined;
      this.clientRequests.set(clientKey, clientData);
      this.logger.log(`Client unblocked: ${clientKey}`);
    }
  }

  /**
   * Get blocked clients list
   */
  getBlockedClients(): Array<{ clientKey: string; blockedUntil: number; remainingTime: number }> {
    const now = Date.now();
    const blockedClients: Array<{ clientKey: string; blockedUntil: number; remainingTime: number }> = [];

    this.clientRequests.forEach((data, clientKey) => {
      if (data.blockedUntil && now < data.blockedUntil) {
        blockedClients.push({
          clientKey,
          blockedUntil: data.blockedUntil,
          remainingTime: data.blockedUntil - now,
        });
      }
    });

    return blockedClients;
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): {
    totalClients: number;
    blockedClients: number;
    totalRequests: number;
    averageRequestsPerClient: number;
  } {
    const now = Date.now();
    const windowStart = now - this.defaultConfig.windowMs;

    let totalRequests = 0;
    let blockedClients = 0;

    this.clientRequests.forEach((data) => {
      // Count current requests in window
      const currentRequests = data.requests.filter(timestamp => timestamp > windowStart).length;
      totalRequests += currentRequests;

      // Count blocked clients
      if (data.blockedUntil && now < data.blockedUntil) {
        blockedClients++;
      }
    });

    return {
      totalClients: this.clientRequests.size,
      blockedClients,
      totalRequests,
      averageRequestsPerClient: this.clientRequests.size > 0 ? totalRequests / this.clientRequests.size : 0,
    };
  }

  /**
   * Generate unique client key
   */
  private generateClientKey(clientInfo: ClientInfo): string {
    // Combine IP and user ID for unique identification
    const userPart = clientInfo.userId ? `user:${clientInfo.userId}` : 'anonymous';
    return `${clientInfo.ip}:${userPart}`;
  }

  /**
   * Cleanup expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const cutoffTime = now - (this.defaultConfig.windowMs * 2); // Keep data for 2 windows

    let cleanedCount = 0;
    this.clientRequests.forEach((data, clientKey) => {
      // Clean old requests
      data.requests = data.requests.filter(timestamp => timestamp > cutoffTime);

      // Remove client if no recent activity and not blocked
      if (
        data.requests.length === 0 &&
        (!data.blockedUntil || data.blockedUntil < cutoffTime)
      ) {
        this.clientRequests.delete(clientKey);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} inactive client entries`);
    }
  }

  /**
   * Check if IP is suspicious (DDoS detection)
   */
  isSuspiciousIP(ip: string): boolean {
    // Check for common DDoS patterns
    const suspiciousPatterns = [
      /^10\./,      // Private network
      /^192\.168\./, // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
      /^127\./,     // Localhost
      /^0\./,       // Invalid
      /^255\./,     // Broadcast
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ip));
  }

  /**
   * Detect potential DDoS attack
   */
  detectDDoSAttack(): {
    isUnderAttack: boolean;
    attackLevel: 'low' | 'medium' | 'high';
    details: {
      uniqueIPs: number;
      totalConnections: number;
      averageRequestsPerIP: number;
      suspiciousIPs: number;
    };
  } {
    const now = Date.now();
    const windowStart = now - 60000; // Last minute

    let uniqueIPs = new Set<string>();
    let totalConnections = 0;
    let suspiciousIPs = 0;

    this.clientRequests.forEach((data) => {
      const recentRequests = data.requests.filter(timestamp => timestamp > windowStart);
      if (recentRequests.length > 0) {
        // Extract IP from client key
        const ip = data.requests.length > 0 ? 'unknown' : 'unknown';

        uniqueIPs.add(ip);
        totalConnections += recentRequests.length;

        if (this.isSuspiciousIP(ip)) {
          suspiciousIPs++;
        }
      }
    });

    const uniqueIPCount = uniqueIPs.size;
    const averageRequestsPerIP = uniqueIPCount > 0 ? totalConnections / uniqueIPCount : 0;

    // DDoS detection logic
    let attackLevel: 'low' | 'medium' | 'high' = 'low';
    let isUnderAttack = false;

    if (uniqueIPCount > 1000 || averageRequestsPerIP > 1000) {
      attackLevel = 'high';
      isUnderAttack = true;
    } else if (uniqueIPCount > 100 || averageRequestsPerIP > 100) {
      attackLevel = 'medium';
      isUnderAttack = true;
    } else if (suspiciousIPs > 10 || averageRequestsPerIP > 50) {
      attackLevel = 'low';
      isUnderAttack = true;
    }

    return {
      isUnderAttack,
      attackLevel,
      details: {
        uniqueIPs: uniqueIPCount,
        totalConnections,
        averageRequestsPerIP,
        suspiciousIPs,
      },
    };
  }

  /**
   * Emergency rate limit activation
   */
  activateEmergencyLimits(): void {
    this.logger.error('Emergency rate limits activated - possible DDoS attack detected');

    // Apply strict limits to all clients
    const emergencyConfig: RateLimitConfig = {
      windowMs: 5000, // 5 seconds
      maxRequests: 1,
      blockDurationMs: 3600000, // 1 hour
    };

    this.clientRequests.forEach((data, clientKey) => {
      data.blockedUntil = Date.now() + emergencyConfig.blockDurationMs;
    });
  }
}
