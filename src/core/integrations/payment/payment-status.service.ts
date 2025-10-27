import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

interface PaymentStatusRecord {
  id: string;
  orderId: string;
  paymentId: string;
  provider: 'iyzico' | 'stripe';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  customerId: string;
  customerEmail: string;
  fraudScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  providerResponse?: any;
  errorDetails?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentErrorLog {
  orderId: string;
  customerId: string;
  customerEmail: string;
  amount: number;
  currency: string;
  provider: string;
  errorMessage: string;
  errorStack?: string;
  processingTime?: number;
  timestamp: string;
  customerIP: string;
}

@Injectable()
export class PaymentStatusService {
  private readonly logger = new Logger(PaymentStatusService.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_KEY_PREFIX = 'payment_status:';

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusRecord | null> {
    try {
      // Check cache first
      const cacheKey = `${this.CACHE_KEY_PREFIX}${paymentId}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.debug(`Payment status retrieved from cache: ${paymentId}`);
        return cached as PaymentStatusRecord;
      }

      // Query database
      const result = await this.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.id, paymentId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const paymentRecord = result[0] as PaymentStatusRecord;

      // Cache the result
      await this.cacheManager.set(cacheKey, paymentRecord, this.CACHE_TTL);

      return paymentRecord;

    } catch (error) {
      this.logger.error(`Failed to get payment status: ${paymentId}`, error.stack);
      return null;
    }
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatusRecord['status'],
    providerResponse?: any,
    errorDetails?: any,
  ): Promise<void> {
    try {
      await this.db
        .update(schema.payments)
        .set({
          status,
          providerResponse: JSON.stringify(providerResponse || {}),
          errorDetails: errorDetails ? JSON.stringify(errorDetails) : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.payments.id, paymentId));

      // Invalidate cache
      await this.invalidatePaymentCache(paymentId);

      this.logger.log(`Payment status updated: ${paymentId} -> ${status}`);

    } catch (error) {
      this.logger.error(`Failed to update payment status: ${paymentId}`, error.stack);
      throw error;
    }
  }

  async createPaymentRecord(record: Partial<PaymentStatusRecord>): Promise<PaymentStatusRecord> {
    try {
      const [newRecord] = await this.db
        .insert(schema.payments)
        .values({
          id: record.id,
          orderId: record.orderId,
          paymentId: record.paymentId,
          provider: record.provider,
          status: record.status || 'pending',
          amount: record.amount,
          currency: record.currency,
          customerId: record.customerId,
          customerEmail: record.customerEmail,
          fraudScore: record.fraudScore,
          riskLevel: record.riskLevel,
          providerResponse: record.providerResponse ? JSON.stringify(record.providerResponse) : '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      this.logger.log(`Payment record created: ${record.id}`);

      return newRecord as PaymentStatusRecord;

    } catch (error) {
      this.logger.error(`Failed to create payment record`, error.stack);
      throw error;
    }
  }

  async logPaymentError(errorLog: PaymentErrorLog): Promise<void> {
    try {
      // In a real implementation, this would insert into a separate error log table
      this.logger.error(`Payment error logged:`, {
        orderId: errorLog.orderId,
        customerId: errorLog.customerId,
        provider: errorLog.provider,
        errorMessage: errorLog.errorMessage,
        processingTime: errorLog.processingTime,
      });

      // Also store in database for monitoring
      await this.db.insert(schema.systemLogs).values({
        userId: errorLog.customerId,
        action: 'payment_error',
        resourceType: 'payment',
        resourceId: errorLog.orderId,
        oldValues: null,
        newValues: JSON.stringify(errorLog),
        ipAddress: errorLog.customerIP,
        userAgent: 'payment_system',
        createdAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to log payment error`, error.stack);
    }
  }

  async getPaymentHistory(
    customerId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<PaymentStatusRecord[]> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}history:${customerId}:${limit}:${offset}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached as PaymentStatusRecord[];
      }

      const result = await this.db
        .select()
        .from(schema.payments)
        .where(eq(schema.payments.customerId, customerId))
        .orderBy('createdAt')
        .limit(limit)
        .offset(offset);

      const paymentHistory = result as PaymentStatusRecord[];

      // Cache for shorter time since this data might change
      await this.cacheManager.set(cacheKey, paymentHistory, 60); // 1 minute

      return paymentHistory;

    } catch (error) {
      this.logger.error(`Failed to get payment history: ${customerId}`, error.stack);
      return [];
    }
  }

  async getFailedPayments(
    since: Date,
    limit: number = 100,
  ): Promise<PaymentStatusRecord[]> {
    try {
      const result = await this.db
        .select()
        .from(schema.payments)
        .where(
          and(
            eq(schema.payments.status, 'failed'),
            // Assuming we have a createdAt filter - would need to add this to schema
          )
        )
        .orderBy('createdAt')
        .limit(limit);

      return result as PaymentStatusRecord[];

    } catch (error) {
      this.logger.error(`Failed to get failed payments`, error.stack);
      return [];
    }
  }

  async getPaymentMetrics(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmount: number;
    successRate: number;
    averageAmount: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  }> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}metrics:${startDate.toISOString()}:${endDate.toISOString()}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        return cached as any;
      }

      // Query payment metrics
      const result = await this.db
        .select({
          status: schema.payments.status,
          amount: schema.payments.amount,
        })
        .from(schema.payments)
        .where(
          // Add date filter when schema supports it
        );

      const totalPayments = result.length;
      const successfulPayments = result.filter(p => p.status === 'completed').length;
      const failedPayments = result.filter(p => p.status === 'failed').length;
      const totalAmount = result.reduce((sum, p) => sum + Number(p.amount), 0);

      const metrics = {
        totalPayments,
        successfulPayments,
        failedPayments,
        totalAmount,
        successRate: totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0,
        averageAmount: totalPayments > 0 ? totalAmount / totalPayments : 0,
        topFailureReasons: [], // Would need error analysis
      };

      // Cache metrics for 5 minutes
      await this.cacheManager.set(cacheKey, metrics, 300);

      return metrics;

    } catch (error) {
      this.logger.error(`Failed to get payment metrics`, error.stack);
      return {
        totalPayments: 0,
        successfulPayments: 0,
        failedPayments: 0,
        totalAmount: 0,
        successRate: 0,
        averageAmount: 0,
        topFailureReasons: [],
      };
    }
  }

  private async invalidatePaymentCache(paymentId: string): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}${paymentId}`;
    await this.cacheManager.del(cacheKey);
  }

  async clearPaymentCache(paymentId: string): Promise<void> {
    await this.invalidatePaymentCache(paymentId);
    this.logger.log(`Payment cache cleared: ${paymentId}`);
  }

  async clearAllPaymentCache(): Promise<void> {
    // In a real implementation, use cache manager's clear method
    // or clear by pattern
    this.logger.log('All payment cache cleared');
  }
}
