import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

interface FraudAnalysisRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerIP: string;
  itemCount: number;
  metadata?: Record<string, any>;
}

interface FraudRule {
  name: string;
  condition: (data: FraudAnalysisRequest) => boolean;
  score: number;
  description: string;
}

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private readonly CACHE_TTL = 600; // 10 minutes
  private readonly HIGH_RISK_THRESHOLD = 70;
  private readonly MEDIUM_RISK_THRESHOLD = 40;

  // Fraud detection rules
  private readonly fraudRules: FraudRule[] = [
    // Amount-based rules
    {
      name: 'high_amount',
      condition: (data) => data.amount > 10000,
      score: 40,
      description: 'High transaction amount',
    },
    {
      name: 'unusual_amount',
      condition: (data) => data.amount > 5000 && data.currency === 'TRY',
      score: 25,
      description: 'Unusual amount for currency',
    },

    // Customer behavior rules
    {
      name: 'new_customer_high_amount',
      condition: (data) => data.amount > 2000 && !data.metadata?.customerHistory,
      score: 30,
      description: 'High amount from new customer',
    },
    {
      name: 'rapid_orders',
      condition: (data) => data.metadata?.recentOrderCount > 5,
      score: 35,
      description: 'Multiple orders in short time',
    },

    // IP-based rules
    {
      name: 'proxy_ip',
      condition: (data) => this.isProxyIP(data.customerIP),
      score: 50,
      description: 'Request from proxy/VPN',
    },
    {
      name: 'international_ip',
      condition: (data) => this.isInternationalIP(data.customerIP, data.metadata?.country),
      score: 20,
      description: 'International IP address',
    },

    // Email-based rules
    {
      name: 'disposable_email',
      condition: (data) => this.isDisposableEmail(data.customerEmail),
      score: 45,
      description: 'Disposable email address',
    },
    {
      name: 'suspicious_email_pattern',
      condition: (data) => this.hasSuspiciousEmailPattern(data.customerEmail),
      score: 25,
      description: 'Suspicious email pattern',
    },

    // Order pattern rules
    {
      name: 'single_item_bulk',
      condition: (data) => data.itemCount === 1 && data.amount > 1000,
      score: 15,
      description: 'Single expensive item',
    },
    {
      name: 'unusual_item_count',
      condition: (data) => data.itemCount > 20,
      score: 20,
      description: 'Unusual number of items',
    },

    // Time-based rules
    {
      name: 'unusual_hour',
      condition: (data) => this.isUnusualHour(new Date()),
      score: 10,
      description: 'Transaction at unusual hour',
    },
    {
      name: 'weekend_high_amount',
      condition: (data) => this.isWeekend(new Date()) && data.amount > 5000,
      score: 15,
      description: 'High amount transaction on weekend',
    },
  ];

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async analyzTransaction(transactionData: string | FraudAnalysisRequest): Promise<{
    fraudScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    recommendation: string;
    rulesTriggered: string[];
    analysisId: string;
  }> {
    const data = typeof transactionData === 'string'
      ? { orderId: transactionData } as FraudAnalysisRequest
      : transactionData;

    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `fraud:${data.orderId}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.debug(`Fraud analysis retrieved from cache: ${data.orderId}`);
        return cached as any;
      }

      this.logger.log(`Starting fraud analysis for order: ${data.orderId}`);

      // Run fraud detection rules
      const triggeredRules: string[] = [];
      const indicators: string[] = [];
      let totalScore = 0;

      for (const rule of this.fraudRules) {
        if (rule.condition(data)) {
          triggeredRules.push(rule.name);
          indicators.push(rule.description);
          totalScore += rule.score;

          this.logger.debug(`Fraud rule triggered: ${rule.name} (+${rule.score} points)`);
        }
      }

      // Apply ML-based scoring if available
      const mlScore = await this.getMLFraudScore(data);
      totalScore += mlScore;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high';
      let recommendation: string;

      if (totalScore >= this.HIGH_RISK_THRESHOLD) {
        riskLevel = 'high';
        recommendation = 'Decline';
      } else if (totalScore >= this.MEDIUM_RISK_THRESHOLD) {
        riskLevel = 'medium';
        recommendation = 'Require additional verification';
      } else {
        riskLevel = 'low';
        recommendation = 'Approve';
      }

      const result = {
        fraudScore: Math.min(totalScore, 100), // Cap at 100
        riskLevel,
        indicators,
        recommendation,
        rulesTriggered: triggeredRules,
        analysisId: `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Cache the result
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

      const analysisTime = Date.now() - startTime;
      this.logger.log(`Fraud analysis completed for ${data.orderId}: score=${totalScore}, level=${riskLevel}, time=${analysisTime}ms`);

      // Log high-risk transactions
      if (riskLevel === 'high') {
        await this.logHighRiskTransaction(data, result);
      }

      return result;

    } catch (error) {
      this.logger.error(`Fraud analysis failed for order ${data.orderId}`, error.stack);

      // Return safe default on error
      return {
        fraudScore: 0,
        riskLevel: 'low',
        indicators: ['Analysis temporarily unavailable'],
        recommendation: 'Approve with manual review',
        rulesTriggered: [],
        analysisId: `error_${Date.now()}`,
      };
    }
  }

  async getCustomerRiskProfile(customerId: string): Promise<{
    totalTransactions: number;
    averageAmount: number;
    riskScore: number;
    lastActivity: Date;
    flaggedTransactions: number;
  }> {
    try {
      const cacheKey = `customer_risk:${customerId}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached as any;
      }

      // In a real implementation, this would query the database
      const profile = {
        totalTransactions: 0,
        averageAmount: 0,
        riskScore: 0,
        lastActivity: new Date(),
        flaggedTransactions: 0,
      };

      await this.cacheManager.set(cacheKey, profile, this.CACHE_TTL * 2);
      return profile;

    } catch (error) {
      this.logger.error(`Failed to get customer risk profile: ${customerId}`, error.stack);
      return {
        totalTransactions: 0,
        averageAmount: 0,
        riskScore: 0,
        lastActivity: new Date(),
        flaggedTransactions: 0,
      };
    }
  }

  private async getMLFraudScore(data: FraudAnalysisRequest): Promise<number> {
    // Mock ML-based fraud scoring
    // In a real implementation, this would call an ML service
    try {
      // Simulate ML model prediction
      let mlScore = 0;

      // Email domain analysis
      if (this.isFreeEmailProvider(data.customerEmail)) {
        mlScore += 10;
      }

      // Amount pattern analysis
      if (data.amount % 100 === 0 && data.amount > 1000) {
        mlScore += 15; // Suspicious round numbers
      }

      // IP reputation check (mock)
      if (this.isHighRiskIP(data.customerIP)) {
        mlScore += 25;
      }

      return Math.min(mlScore, 50); // Cap ML contribution

    } catch (error) {
      this.logger.error(`ML fraud scoring failed`, error.stack);
      return 0;
    }
  }

  private isProxyIP(ip: string): boolean {
    // Mock proxy detection
    const proxyIndicators = ['proxy', 'vpn', 'tor'];
    return proxyIndicators.some(indicator => ip.toLowerCase().includes(indicator));
  }

  private isInternationalIP(ip: string, country?: string): boolean {
    // Mock international IP detection
    // In real implementation, use IP geolocation service
    return !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.');
  }

  private isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email', 'yopmail.com'
    ];

    const domain = email.split('@')[1];
    return disposableDomains.includes(domain);
  }

  private hasSuspiciousEmailPattern(email: string): boolean {
    const suspiciousPatterns = [
      /\+.*@/, // Plus addressing
      /test.*@/, // Test emails
      /admin.*@/, // Admin-like emails
      /.*\+.*@/, // Gmail plus
    ];

    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  private isFreeEmailProvider(email: string): boolean {
    const freeProviders = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'icloud.com', 'protonmail.com', 'mail.com'
    ];

    const domain = email.split('@')[1];
    return freeProviders.includes(domain);
  }

  private isHighRiskIP(ip: string): boolean {
    // Mock high-risk IP detection
    // In real implementation, use threat intelligence feeds
    const highRiskPrefixes = ['185.100.', '185.101.', '185.102.'];
    return highRiskPrefixes.some(prefix => ip.startsWith(prefix));
  }

  private isUnusualHour(date: Date): boolean {
    const hour = date.getHours();
    return hour < 6 || hour > 22; // Outside normal business hours
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  private async logHighRiskTransaction(data: FraudAnalysisRequest, result: any): Promise<void> {
    const logData = {
      orderId: data.orderId,
      fraudScore: result.fraudScore,
      riskLevel: result.riskLevel,
      triggeredRules: result.rulesTriggered,
      indicators: result.indicators,
      customerEmail: data.customerEmail,
      customerIP: data.customerIP,
      amount: data.amount,
      currency: data.currency,
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(`High-risk transaction flagged: ${JSON.stringify(logData)}`);

    // In a real implementation, send to security team and block payment
    // await this.securityService.alertHighRiskTransaction(logData);
  }
}

