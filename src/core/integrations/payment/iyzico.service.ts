import { Injectable, Logger } from '@nestjs/common';
import Iyzipay from 'iyzipay';

interface PaymentRequest {
  price: number;
  paidPrice: number;
  currency: string;
  basketId: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    identityNumber: string;
    registrationAddress: string;
    city: string;
    country: string;
    ip: string;
  };
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
  };
  basketItems: Array<{
    id: string;
    name: string;
    category1: string;
    itemType: string;
    price: number;
  }>;
}

@Injectable()
export class IyzicoService {
  private readonly logger = new Logger(IyzicoService.name);
  private iyzipay: any;
  private readonly enabled: boolean;

  constructor() {
    const apiKey = process.env.IYZICO_API_KEY;
    const secretKey = process.env.IYZICO_SECRET_KEY;
    
    this.enabled = !!(apiKey && secretKey);

    if (this.enabled) {
      this.iyzipay = new Iyzipay({
        apiKey,
        secretKey,
        uri: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
      });
      this.logger.log('Iyzico payment gateway configured successfully');
    } else {
      this.logger.warn('Iyzico credentials not found. Payment service disabled.');
    }
  }

  async createPayment(request: PaymentRequest, callbackUrl: string): Promise<any> {
    if (!this.enabled) {
      this.logger.warn('Payment request skipped - Iyzico not configured');
      return {
        success: false,
        message: 'Payment service not configured',
      };
    }

    const paymentRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: request.basketId,
      price: request.price.toFixed(2),
      paidPrice: request.paidPrice.toFixed(2),
      currency: request.currency,
      basketId: request.basketId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: request.buyer,
      shippingAddress: request.billingAddress,
      billingAddress: request.billingAddress,
      basketItems: request.basketItems.map(item => ({
        ...item,
        price: item.price.toFixed(2),
      })),
    };

    return new Promise((resolve, reject) => {
      this.iyzipay.checkoutFormInitialize.create(paymentRequest, (err: any, result: any) => {
        if (err) {
          this.logger.error('Iyzico payment initialization failed', err);
          reject(err);
        } else {
          this.logger.log(`Payment initialized: ${result.token}`);
          resolve(result);
        }
      });
    });
  }

  async retrievePaymentResult(token: string): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Payment service not configured',
      };
    }

    return new Promise((resolve, reject) => {
      this.iyzipay.checkoutForm.retrieve(
        { locale: Iyzipay.LOCALE.TR, token },
        (err: any, result: any) => {
          if (err) {
            this.logger.error('Payment result retrieval failed', err);
            reject(err);
          } else {
            this.logger.log(`Payment result retrieved: ${result.paymentStatus}`);
            resolve(result);
          }
        }
      );
    });
  }

  async createRefund(paymentId: string, amount: number, currency: string = 'TRY'): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Payment service not configured',
      };
    }

    const refundRequest = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: `refund-${Date.now()}`,
      paymentTransactionId: paymentId,
      price: amount.toFixed(2),
      currency,
    };

    return new Promise((resolve, reject) => {
      this.iyzipay.refund.create(refundRequest, (err: any, result: any) => {
        if (err) {
          this.logger.error('Refund creation failed', err);
          reject(err);
        } else {
          this.logger.log(`Refund created: ${result.status}`);
          resolve(result);
        }
      });
    });
  }

  async get3DSecureHtmlContent(paymentPageUrl: string): Promise<string> {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Güvenli Ödeme</title>
      </head>
      <body>
        <script src="${paymentPageUrl}"></script>
      </body>
      </html>
    `;
  }
}
