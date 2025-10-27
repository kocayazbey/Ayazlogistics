import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer';
  cardDetails?: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  };
  customerDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  threeDSecureRequired?: boolean;
  redirectUrl?: string;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);
  private readonly bankApiUrl: string;
  private readonly merchantId: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(private configService: ConfigService) {
    this.bankApiUrl = this.configService.get<string>('PAYMENT_BANK_API_URL', 'https://api.bank.com/payments');
    this.merchantId = this.configService.get<string>('PAYMENT_MERCHANT_ID', '');
    this.apiKey = this.configService.get<string>('PAYMENT_API_KEY', '');
    this.webhookSecret = this.configService.get<string>('PAYMENT_WEBHOOK_SECRET', '');
  }

  /**
   * Process payment with comprehensive validation and security
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      this.logger.log(`Processing payment for order: ${request.orderId}`);

      // Validate payment request
      const validationResult = this.validatePaymentRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          error: validationResult.error,
          errorCode: validationResult.errorCode,
        };
      }

      // Generate unique payment ID
      const paymentId = this.generatePaymentId();

      // Check for 3D Secure requirement
      const requires3DS = this.requires3DSecure(request);
      if (requires3DS) {
        this.logger.log(`3D Secure required for payment: ${paymentId}`);

        return {
          success: false,
          paymentId,
          status: 'pending',
          amount: request.amount,
          currency: request.currency,
          threeDSecureRequired: true,
          redirectUrl: `${this.configService.get('APP_URL', 'http://localhost:3000')}/payment/3ds/${paymentId}`,
          metadata: {
            orderId: request.orderId,
            requires3DS: true,
          },
        };
      }

      // Process direct payment (for non-3DS transactions)
      const paymentResult = await this.executePayment(paymentId, request);

      this.logger.log(`Payment processed: ${paymentId} - Status: ${paymentResult.status}`);

      return paymentResult;
    } catch (error) {
      this.logger.error('Payment processing error:', error);
      return {
        success: false,
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        error: 'Internal server error during payment processing',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): { valid: boolean; error?: string; errorCode?: string } {
    // Basic validation
    if (!request.orderId || request.orderId.trim().length === 0) {
      return { valid: false, error: 'Order ID is required', errorCode: 'INVALID_ORDER_ID' };
    }

    if (request.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0', errorCode: 'INVALID_AMOUNT' };
    }

    if (!request.currency || request.currency.length !== 3) {
      return { valid: false, error: 'Valid currency code is required', errorCode: 'INVALID_CURRENCY' };
    }

    // Card validation for credit/debit card payments
    if (request.paymentMethod === 'credit_card' || request.paymentMethod === 'debit_card') {
      if (!request.cardDetails) {
        return { valid: false, error: 'Card details are required', errorCode: 'MISSING_CARD_DETAILS' };
      }

      const cardValidation = this.validateCardDetails(request.cardDetails);
      if (!cardValidation.valid) {
        return cardValidation;
      }
    }

    // Customer details validation
    if (!request.customerDetails.name || request.customerDetails.name.trim().length === 0) {
      return { valid: false, error: 'Customer name is required', errorCode: 'INVALID_CUSTOMER_NAME' };
    }

    if (!request.customerDetails.email || !this.isValidEmail(request.customerDetails.email)) {
      return { valid: false, error: 'Valid email address is required', errorCode: 'INVALID_EMAIL' };
    }

    return { valid: true };
  }

  /**
   * Validate card details
   */
  private validateCardDetails(cardDetails: any): { valid: boolean; error?: string; errorCode?: string } {
    if (!cardDetails.cardNumber || !this.isValidCardNumber(cardDetails.cardNumber)) {
      return { valid: false, error: 'Valid card number is required', errorCode: 'INVALID_CARD_NUMBER' };
    }

    if (!cardDetails.expiryMonth || !cardDetails.expiryYear) {
      return { valid: false, error: 'Card expiry date is required', errorCode: 'INVALID_EXPIRY_DATE' };
    }

    if (!this.isValidExpiry(cardDetails.expiryMonth, cardDetails.expiryYear)) {
      return { valid: false, error: 'Card has expired', errorCode: 'CARD_EXPIRED' };
    }

    if (!cardDetails.cvv || !/^\d{3,4}$/.test(cardDetails.cvv)) {
      return { valid: false, error: 'Valid CVV is required', errorCode: 'INVALID_CVV' };
    }

    if (!cardDetails.cardholderName || cardDetails.cardholderName.trim().length === 0) {
      return { valid: false, error: 'Cardholder name is required', errorCode: 'INVALID_CARDHOLDER_NAME' };
    }

    return { valid: true };
  }

  /**
   * Check if 3D Secure is required
   */
  private requires3DSecure(request: PaymentRequest): boolean {
    // 3D Secure is required for:
    // 1. All online transactions above 100 TRY
    // 2. All international transactions
    // 3. High-risk merchants
    // 4. First-time customers

    const amountThreshold = 100; // TRY
    const isHighValue = request.amount > amountThreshold;
    const isInternational = request.currency !== 'TRY';
    const isHighRiskMerchant = this.isHighRiskMerchant(request);

    return isHighValue || isInternational || isHighRiskMerchant;
  }

  /**
   * Execute payment with bank
   */
  private async executePayment(paymentId: string, request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const bankRequest = {
        paymentId,
        merchantId: this.merchantId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        cardDetails: request.cardDetails ? {
          cardNumber: this.maskCardNumber(request.cardDetails.cardNumber),
          expiryMonth: request.cardDetails.expiryMonth,
          expiryYear: request.cardDetails.expiryYear,
          cardholderName: request.cardDetails.cardholderName,
        } : undefined,
        customerDetails: request.customerDetails,
        billingAddress: request.billingAddress,
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(paymentId, request),
      };

      this.logger.log('Calling bank payment API:', { paymentId, orderId: request.orderId });

      // Call bank API
      const bankResponse = await this.callBankPaymentAPI(bankRequest);

      if (bankResponse.success) {
        this.logger.log(`Payment successful: ${paymentId}`);

        return {
          success: true,
          paymentId,
          status: 'completed',
          amount: request.amount,
          currency: request.currency,
          metadata: {
            bankReference: bankResponse.bankReference,
            transactionId: bankResponse.transactionId,
            authCode: bankResponse.authCode,
          },
        };
      } else {
        this.logger.error(`Payment failed: ${paymentId} - ${bankResponse.errorMessage}`);

        return {
          success: false,
          paymentId,
          status: 'failed',
          amount: request.amount,
          currency: request.currency,
          error: bankResponse.errorMessage,
          errorCode: bankResponse.errorCode,
        };
      }
    } catch (error) {
      this.logger.error('Bank API call failed:', error);
      return {
        success: false,
        paymentId,
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        error: 'Bank communication failed',
        errorCode: 'BANK_COMMUNICATION_ERROR',
      };
    }
  }

  /**
   * Generate payment signature for security
   */
  private generateSignature(paymentId: string, request: PaymentRequest): string {
    const signatureData = [
      this.merchantId,
      paymentId,
      request.orderId,
      request.amount.toString(),
      request.currency,
    ].join('|');

    return crypto
      .createHmac('sha256', this.apiKey)
      .update(signatureData)
      .digest('hex');
  }

  /**
   * Call bank payment API
   */
  private async callBankPaymentAPI(request: any): Promise<any> {
    // Mock bank API implementation
    // In production, integrate with actual bank API

    this.logger.log('Calling bank payment API:', {
      paymentId: request.paymentId,
      merchantId: request.merchantId,
    });

    // Simulate API call delay
    await this.delay(2000);

    // Mock successful payment response
    return {
      success: true,
      bankReference: `BR_${Date.now()}`,
      transactionId: `TXN_${crypto.randomBytes(8).toString('hex')}`,
      authCode: `AUTH_${Math.floor(Math.random() * 1000000)}`,
    };
  }

  /**
   * Validate card number
   */
  private isValidCardNumber(cardNumber: string): boolean {
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    return /^\d{13,19}$/.test(cleanNumber) && this.luhnCheck(cleanNumber);
  }

  /**
   * Luhn algorithm check
   */
  private luhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let shouldDouble = false;

    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i));

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if merchant is high risk
   */
  private isHighRiskMerchant(request: PaymentRequest): boolean {
    // Implement risk assessment logic
    // For now, all merchants are considered low risk
    return false;
  }

  /**
   * Generate unique payment ID
   */
  private generatePaymentId(): string {
    return `pay_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Mask card number for logging
   */
  private maskCardNumber(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 10) return cleanNumber;

    const firstSix = cleanNumber.substring(0, 6);
    const lastFour = cleanNumber.substring(cleanNumber.length - 4);
    const masked = '*'.repeat(cleanNumber.length - 10);

    return `${firstSix}${masked}${lastFour}`;
  }

  /**
   * Check if card is expired
   */
  private isValidExpiry(month: string, year: string): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    const expYear = parseInt(year);
    const expMonth = parseInt(month);

    if (expYear < currentYear) return false;
    if (expYear === currentYear && expMonth < currentMonth) return false;

    return true;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
