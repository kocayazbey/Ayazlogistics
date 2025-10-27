import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_ORM } from '../../database/database.constants';
import { StandardizedDatabaseService } from '../../database/standardized-database.service';
import { ThreeDSecureService } from './three-d-secure.service';
import { PaymentProcessorService, PaymentRequest, PaymentResponse } from './payment-processor.service';
// Temporarily commenting out AI fraud detection service import
// import { FraudDetectionService } from '../../ai/fraud-detection.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
    private readonly configService: ConfigService,
    private readonly threeDSecureService: ThreeDSecureService,
    private readonly paymentProcessor: PaymentProcessorService,
  ) {}

  private get db() {
    return this.dbService.getClient();
  }

  /**
   * Initiate payment process with 3D Secure support
   */
  async initiatePayment(
    createPaymentDto: CreatePaymentDto,
    userId: string,
    tenantId: string,
  ): Promise<PaymentResponse> {
    try {
      this.logger.log(`Initiating payment for user: ${userId}, order: ${createPaymentDto.orderId}`);

      const paymentRequest: PaymentRequest = {
        orderId: createPaymentDto.orderId,
        amount: createPaymentDto.amount,
        currency: createPaymentDto.currency,
        paymentMethod: createPaymentDto.paymentMethod,
        cardDetails: createPaymentDto.cardDetails,
        customerDetails: createPaymentDto.customerDetails,
        billingAddress: createPaymentDto.billingAddress,
      };

      // Process payment through payment processor
      const result = await this.paymentProcessor.processPayment(paymentRequest);

      if (result.success) {
        // Store successful payment in database
        await this.storePayment(userId, tenantId, result);
      } else {
        // Store failed payment attempt
        await this.storePayment(userId, tenantId, result);
      }

      return result;
    } catch (error) {
      this.logger.error('Payment initiation failed:', error);
      throw new BadRequestException('Failed to initiate payment');
    }
  }

  /**
   * Verify payment after 3D Secure authentication
   */
  async verifyPayment(verifyPaymentDto: VerifyPaymentDto, userId: string): Promise<PaymentResponse> {
    try {
      this.logger.log(`Verifying payment: ${verifyPaymentDto.paymentId}`);

      // Verify 3D Secure authentication
      const threeDSecureResult = await this.threeDSecureService.verify3DSecure(
        verifyPaymentDto.threeDSecureId,
        verifyPaymentDto.authenticationId,
        verifyPaymentDto.cavv,
        verifyPaymentDto.eci,
        verifyPaymentDto.xid,
      );

      if (!threeDSecureResult.success) {
        return {
          success: false,
          status: 'failed',
          amount: 0,
          currency: 'TRY',
          error: threeDSecureResult.error,
          errorCode: threeDSecureResult.errorCode,
        };
      }

      // Update payment status in database
      await this.updatePaymentStatus(verifyPaymentDto.paymentId, 'completed', userId);

      // Get updated payment from database
      const payment = await this.getPaymentFromDatabase(verifyPaymentDto.paymentId, userId);

      return {
        success: true,
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        metadata: payment.metadata,
      };
    } catch (error) {
      this.logger.error('Payment verification failed:', error);
      throw new BadRequestException('Failed to verify payment');
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string, userId: string): Promise<any> {
    try {
      const payment = await this.getPaymentFromDatabase(paymentId, userId);

      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        metadata: payment.metadata,
      };
    } catch (error) {
      this.logger.error('Failed to get payment status:', error);
      throw new NotFoundException('Payment not found');
    }
  }

  /**
   * Process payment refund
   */
  async refundPayment(
    paymentId: string,
    refundData: { amount?: number; reason: string },
    userId: string,
  ): Promise<PaymentResponse> {
    try {
      this.logger.log(`Processing refund for payment: ${paymentId}`);

      const payment = await this.getPaymentFromDatabase(paymentId, userId);

      if (payment.status !== 'completed') {
        throw new BadRequestException('Only completed payments can be refunded');
      }

      const refundAmount = refundData.amount || payment.amount;

      if (refundAmount > payment.amount) {
        throw new BadRequestException('Refund amount cannot exceed payment amount');
      }

      // Update payment status to refunded
      await this.updatePaymentStatus(paymentId, 'refunded', userId, {
        refundAmount,
        refundReason: refundData.reason,
        refundedAt: new Date(),
      });

      return {
        success: true,
        paymentId,
        status: 'refunded',
        amount: refundAmount,
        currency: payment.currency,
        metadata: {
          originalAmount: payment.amount,
          refundReason: refundData.reason,
        },
      };
    } catch (error) {
      this.logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods(): any {
    return {
      methods: [
        {
          id: 'credit_card',
          name: 'Credit Card',
          description: 'Visa, MasterCard, American Express',
          supportedCurrencies: ['TRY', 'USD', 'EUR'],
          requires3DS: true,
        },
        {
          id: 'debit_card',
          name: 'Debit Card',
          description: 'Bank debit cards',
          supportedCurrencies: ['TRY'],
          requires3DS: true,
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          description: 'Direct bank account transfer',
          supportedCurrencies: ['TRY', 'USD', 'EUR'],
          requires3DS: false,
        },
      ],
    };
  }

  /**
   * Get payment history for user
   */
  async getPaymentHistory(
    userId: string,
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    status?: string,
  ): Promise<any> {
    try {
      const offset = (page - 1) * limit;

      // In a real implementation, you would query the payments table
      // For now, return mock data structure
      return {
        payments: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get payment history:', error);
      throw error;
    }
  }

  /**
   * Store payment in database
   */
  private async storePayment(userId: string, tenantId: string, paymentResponse: PaymentResponse): Promise<void> {
    // TODO: Implement payment storage in database
    // This would involve creating a payments table with proper schema

    this.logger.log(`Storing payment: ${paymentResponse.paymentId} - Status: ${paymentResponse.status}`);
  }

  /**
   * Update payment status in database
   */
  private async updatePaymentStatus(
    paymentId: string,
    status: string,
    userId: string,
    metadata?: any,
  ): Promise<void> {
    // TODO: Implement payment status update in database
    this.logger.log(`Updating payment status: ${paymentId} - Status: ${status}`);
  }

  /**
   * Get payment from database
   */
  private async getPaymentFromDatabase(paymentId: string, userId: string): Promise<any> {
    // TODO: Implement payment retrieval from database
    // For now, throw not found error
    throw new NotFoundException('Payment not found');
  }

  /**
   * Validate payment limits
   */
  private validatePaymentLimits(amount: number, currency: string): boolean {
    const limits = {
      TRY: { min: 1, max: 100000 },
      USD: { min: 0.1, max: 10000 },
      EUR: { min: 0.1, max: 10000 },
    };

    const limit = limits[currency as keyof typeof limits];
    if (!limit) return false;

    return amount >= limit.min && amount <= limit.max;
  }

  /**
   * Calculate payment fees
   */
  calculatePaymentFees(amount: number, paymentMethod: string): { fees: number; total: number } {
    const feeRates = {
      credit_card: 0.029, // 2.9%
      debit_card: 0.015,  // 1.5%
      bank_transfer: 0.005, // 0.5%
    };

    const rate = feeRates[paymentMethod as keyof typeof feeRates] || 0;
    const fees = Math.round(amount * rate * 100) / 100;
    const total = amount + fees;

    return { fees, total };
  }

  /**
   * Check payment security
   */
  private async checkPaymentSecurity(paymentRequest: PaymentRequest): Promise<{ safe: boolean; riskLevel: string; recommendations: string[] }> {
    const recommendations: string[] = [];
    let riskLevel = 'low';

    // Check for suspicious patterns
    if (paymentRequest.amount > 50000) {
      recommendations.push('High amount payment requires additional verification');
      riskLevel = 'high';
    }

    if (paymentRequest.customerDetails.email.includes('temp') || paymentRequest.customerDetails.email.includes('test')) {
      recommendations.push('Test email detected - additional verification required');
      riskLevel = 'medium';
    }

    // Check card country vs billing address country
    if (paymentRequest.billingAddress && paymentRequest.cardDetails) {
      const cardCountry = this.detectCardCountry(paymentRequest.cardDetails.cardNumber);
      if (cardCountry !== paymentRequest.billingAddress.country) {
        recommendations.push('Card country mismatch with billing address');
        riskLevel = 'medium';
      }
    }

    return {
      safe: riskLevel === 'low',
      riskLevel,
      recommendations,
    };
  }

  /**
   * Detect card country from BIN number
   */
  private detectCardCountry(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s+/g, '');

    if (cleanNumber.startsWith('4')) return 'US'; // Visa
    if (cleanNumber.startsWith('5')) return 'US'; // MasterCard
    if (cleanNumber.startsWith('3')) return 'US'; // Amex
    if (cleanNumber.startsWith('9792')) return 'TR'; // Troy

    return 'Unknown';
  }
}
