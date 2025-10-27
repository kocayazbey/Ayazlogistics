import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface PayTRPaymentRequest {
  merchantOrderId: string;
  amount: number; // in kuruş
  successUrl: string;
  failUrl: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
  basket: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  installment?: number;
  currency?: 'TL' | 'USD' | 'EUR';
  lang?: 'tr' | 'en';
}

interface PayTRPaymentResponse {
  success: boolean;
  token?: string;
  paymentUrl?: string;
  error?: string;
}

@Injectable()
export class PayTRPaymentService {
  private readonly logger = new Logger(PayTRPaymentService.name);
  private readonly client: AxiosInstance;
  private readonly merchantId: string;
  private readonly merchantKey: string;
  private readonly merchantSalt: string;
  private readonly testMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('PAYTR_MERCHANT_ID') || '';
    this.merchantKey = this.configService.get<string>('PAYTR_MERCHANT_KEY') || '';
    this.merchantSalt = this.configService.get<string>('PAYTR_MERCHANT_SALT') || '';
    this.testMode = this.configService.get<string>('PAYTR_TEST_MODE') === 'true';

    const baseUrl = this.testMode
      ? 'https://www.paytr.com/odeme/api'
      : 'https://www.paytr.com/odeme/api';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });
  }

  async initiatePayment(request: PayTRPaymentRequest, tenantId: string): Promise<PayTRPaymentResponse> {
    try {
      this.logger.log(`Initiating PayTR payment for tenant ${tenantId}`);

      const userIp = '127.0.0.1'; // Should get from request
      const basketStr = this.encodeBasket(request.basket);
      const noInstallment = request.installment ? '0' : '1';
      const maxInstallment = request.installment || 0;

      const hashStr = 
        this.merchantId + 
        userIp + 
        request.merchantOrderId + 
        request.customer.email + 
        request.amount + 
        basketStr + 
        noInstallment + 
        maxInstallment + 
        (request.currency || 'TL') + 
        this.testMode ? '1' : '0' + 
        this.merchantSalt;

      const token = crypto
        .createHmac('sha256', this.merchantKey)
        .update(hashStr)
        .digest('base64');

      const formData = new URLSearchParams({
        merchant_id: this.merchantId,
        user_ip: userIp,
        merchant_oid: request.merchantOrderId,
        email: request.customer.email,
        payment_amount: request.amount.toString(),
        payment_type: 'card',
        installment_count: (request.installment || 0).toString(),
        currency: request.currency || 'TL',
        test_mode: this.testMode ? '1' : '0',
        non_3d: '0',
        merchant_ok_url: request.successUrl,
        merchant_fail_url: request.failUrl,
        user_name: request.customer.name,
        user_address: request.customer.address,
        user_phone: request.customer.phone,
        user_basket: basketStr,
        debug_on: this.testMode ? '1' : '0',
        no_installment: noInstallment,
        max_installment: maxInstallment.toString(),
        lang: request.lang || 'tr',
        paytr_token: token,
      });

      const response = await this.client.post('/get-token', formData.toString());

      if (response.data?.status === 'success') {
        return {
          success: true,
          token: response.data.token,
          paymentUrl: `https://www.paytr.com/odeme/guvenli/${response.data.token}`,
        };
      } else {
        return {
          success: false,
          error: response.data?.reason || 'Payment initialization failed',
        };
      }
    } catch (error: any) {
      this.logger.error(`PayTR payment initiation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyCallback(postData: any): Promise<{ success: boolean; merchantOrderId?: string; amount?: number }> {
    try {
      const hash = crypto
        .createHmac('sha256', this.merchantKey)
        .update(postData.merchant_oid + this.merchantSalt + postData.status + postData.total_amount)
        .digest('base64');

      if (hash !== postData.hash) {
        this.logger.warn('PayTR callback hash verification failed');
        return { success: false };
      }

      return {
        success: postData.status === 'success',
        merchantOrderId: postData.merchant_oid,
        amount: parseInt(postData.total_amount),
      };
    } catch (error: any) {
      this.logger.error(`PayTR callback verification failed: ${error.message}`);
      return { success: false };
    }
  }

  async refund(merchantOrderId: string, amount: number): Promise<boolean> {
    try {
      const hashStr = this.merchantId + merchantOrderId + amount + this.merchantSalt;
      const hash = crypto
        .createHmac('sha256', this.merchantKey)
        .update(hashStr)
        .digest('base64');

      const formData = new URLSearchParams({
        merchant_id: this.merchantId,
        merchant_oid: merchantOrderId,
        return_amount: amount.toString(),
        paytr_token: hash,
      });

      const response = await this.client.post('/refund', formData.toString());

      return response.data?.status === 'success';
    } catch (error: any) {
      this.logger.error(`PayTR refund failed: ${error.message}`);
      return false;
    }
  }

  private encodeBasket(basket: Array<{ name: string; price: number; quantity: number }>): string {
    const basketItems = basket.map(item => 
      [item.name, (item.price / 100).toFixed(2), item.quantity].join(',')
    );
    return Buffer.from(basketItems.join(';')).toString('base64');
  }
}

