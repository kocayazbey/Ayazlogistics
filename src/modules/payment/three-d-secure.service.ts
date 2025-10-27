import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface ThreeDSecureRequest {
  amount: number;
  currency: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  returnUrl: string;
  merchantId: string;
  orderId: string;
}

export interface ThreeDSecureResponse {
  success: boolean;
  threeDSecureId?: string;
  redirectUrl?: string;
  error?: string;
  errorCode?: string;
}

export interface BankResponse {
  status: string;
  authenticationId?: string;
  redirectUrl?: string;
  errorMessage?: string;
  errorCode?: string;
}

@Injectable()
export class ThreeDSecureService {
  private readonly logger = new Logger(ThreeDSecureService.name);
  private readonly bankApiUrl: string;
  private readonly merchantId: string;
  private readonly merchantSecret: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.bankApiUrl = this.configService.get<string>('PAYMENT_BANK_API_URL', 'https://api.bank.com/3ds');
    this.merchantId = this.configService.get<string>('PAYMENT_MERCHANT_ID', '');
    this.merchantSecret = this.configService.get<string>('PAYMENT_MERCHANT_SECRET', '');
    this.apiKey = this.configService.get<string>('PAYMENT_API_KEY', '');
  }

  /**
   * Initiate 3D Secure authentication with bank
   */
  async initiate3DSecure(request: ThreeDSecureRequest): Promise<ThreeDSecureResponse> {
    try {
      this.logger.log(`Initiating 3D Secure for order: ${request.orderId}`);

      // Validate card number using Luhn algorithm
      if (!this.validateCardNumber(request.cardNumber)) {
        return {
          success: false,
          error: 'Invalid card number',
          errorCode: 'INVALID_CARD',
        };
      }

      // Generate unique 3D Secure ID
      const threeDSecureId = this.generateThreeDSecureId();

      // Prepare bank API request
      const bankRequest = {
        merchantId: this.merchantId,
        orderId: request.orderId,
        amount: request.amount,
        currency: request.currency,
        cardNumber: this.maskCardNumber(request.cardNumber),
        expiryMonth: request.expiryMonth,
        expiryYear: request.expiryYear,
        cvv: request.cvv,
        cardholderName: request.cardholderName,
        returnUrl: request.returnUrl,
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(request),
      };

      // Call bank 3D Secure API
      const bankResponse = await this.callBank3DSecureAPI(bankRequest);

      if (bankResponse.status === 'SUCCESS') {
        this.logger.log(`3D Secure initiated successfully: ${threeDSecureId}`);

        return {
          success: true,
          threeDSecureId,
          redirectUrl: bankResponse.redirectUrl,
        };
      } else {
        this.logger.error(`3D Secure initiation failed: ${bankResponse.errorMessage}`);

        return {
          success: false,
          error: bankResponse.errorMessage || '3D Secure initiation failed',
          errorCode: bankResponse.errorCode || 'BANK_ERROR',
        };
      }
    } catch (error) {
      this.logger.error('3D Secure initiation error:', error);
      return {
        success: false,
        error: 'Internal server error during 3D Secure initiation',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Verify 3D Secure authentication result
   */
  async verify3DSecure(
    threeDSecureId: string,
    authenticationId: string,
    cavv: string,
    eci: string,
    xid: string,
  ): Promise<ThreeDSecureResponse> {
    try {
      this.logger.log(`Verifying 3D Secure for ID: ${threeDSecureId}`);

      // Verify authentication with bank
      const verificationRequest = {
        merchantId: this.merchantId,
        threeDSecureId,
        authenticationId,
        cavv,
        eci,
        xid,
        signature: this.generateVerificationSignature(threeDSecureId, authenticationId),
      };

      const verificationResponse = await this.callBankVerificationAPI(verificationRequest);

      if (verificationResponse.status === 'AUTHENTICATED') {
        this.logger.log(`3D Secure verified successfully: ${threeDSecureId}`);

        return {
          success: true,
          threeDSecureId,
        };
      } else {
        this.logger.error(`3D Secure verification failed: ${verificationResponse.errorMessage}`);

        return {
          success: false,
          error: verificationResponse.errorMessage || '3D Secure verification failed',
          errorCode: verificationResponse.errorCode || 'VERIFICATION_FAILED',
        };
      }
    } catch (error) {
      this.logger.error('3D Secure verification error:', error);
      return {
        success: false,
        error: 'Internal server error during 3D Secure verification',
        errorCode: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Validate card number using Luhn algorithm
   */
  private validateCardNumber(cardNumber: string): boolean {
    const cleanNumber = cardNumber.replace(/\s+/g, '');

    if (!/^\d{13,19}$/.test(cleanNumber)) {
      return false;
    }

    let sum = 0;
    let shouldDouble = false;

    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber.charAt(i));

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
   * Mask card number for logging (show only first 6 and last 4 digits)
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
   * Generate signature for bank API request
   */
  private generateSignature(request: ThreeDSecureRequest): string {
    const signatureData = [
      this.merchantId,
      request.orderId,
      request.amount.toString(),
      request.currency,
      request.returnUrl,
    ].join('|');

    return crypto
      .createHmac('sha256', this.merchantSecret)
      .update(signatureData)
      .digest('hex');
  }

  /**
   * Generate signature for verification request
   */
  private generateVerificationSignature(threeDSecureId: string, authenticationId: string): string {
    const signatureData = [this.merchantId, threeDSecureId, authenticationId].join('|');

    return crypto
      .createHmac('sha256', this.merchantSecret)
      .update(signatureData)
      .digest('hex');
  }

  /**
   * Generate unique 3D Secure ID
   */
  private generateThreeDSecureId(): string {
    return `3ds_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Call bank 3D Secure API
   */
  private async callBank3DSecureAPI(request: any): Promise<BankResponse> {
    // This is a mock implementation
    // In production, integrate with actual bank API (e.g., Garanti, Akbank, etc.)

    this.logger.log('Calling bank 3D Secure API:', { merchantId: request.merchantId, orderId: request.orderId });

    // Simulate bank API call
    await this.delay(1000); // Simulate network delay

    // Mock successful response
    return {
      status: 'SUCCESS',
      authenticationId: crypto.randomBytes(16).toString('hex'),
      redirectUrl: `https://bank.com/3ds/auth?authId=${crypto.randomBytes(16).toString('hex')}`,
    };
  }

  /**
   * Call bank verification API
   */
  private async callBankVerificationAPI(request: any): Promise<BankResponse> {
    this.logger.log('Calling bank verification API:', { threeDSecureId: request.threeDSecureId });

    // Simulate verification API call
    await this.delay(500);

    // Mock successful verification
    return {
      status: 'AUTHENTICATED',
      authenticationId: request.authenticationId,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get supported card types
   */
  getSupportedCardTypes(): string[] {
    return [
      'visa',
      'mastercard',
      'amex',
      'troy',
      'discover',
    ];
  }

  /**
   * Check if card type is supported
   */
  isCardTypeSupported(cardNumber: string): boolean {
    const cardType = this.detectCardType(cardNumber);
    return this.getSupportedCardTypes().includes(cardType);
  }

  /**
   * Detect card type from card number
   */
  detectCardType(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\s+/g, '');

    if (/^4/.test(cleanNumber)) return 'visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'amex';
    if (/^9792/.test(cleanNumber)) return 'troy';
    if (/^6(?:011|5)/.test(cleanNumber)) return 'discover';

    return 'unknown';
  }
}
