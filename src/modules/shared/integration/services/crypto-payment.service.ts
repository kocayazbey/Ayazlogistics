import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CryptoPaymentService {
  private readonly apiUrl = process.env.CRYPTO_PAYMENT_API_URL;
  private readonly apiKey = process.env.CRYPTO_PAYMENT_API_KEY;

  async createPaymentRequest(
    amount: number,
    currency: 'BTC' | 'ETH' | 'USDT' | 'USDC',
    orderId: string,
    tenantId: string,
  ): Promise<{
    paymentId: string;
    walletAddress: string;
    amount: number;
    qrCode: string;
    expiresAt: Date;
  }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/payments`,
        {
          amount,
          currency,
          order_reference: orderId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        paymentId: response.data.payment_id,
        walletAddress: response.data.wallet_address,
        amount: response.data.amount,
        qrCode: response.data.qr_code,
        expiresAt: new Date(response.data.expires_at),
      };
    } catch (error) {
      throw new Error(`Crypto payment request failed: ${error.message}`);
    }
  }

  async checkPaymentStatus(paymentId: string, tenantId: string): Promise<{
    status: 'pending' | 'confirming' | 'completed' | 'expired' | 'failed';
    confirmations: number;
    transactionHash?: string;
  }> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return {
        status: response.data.status,
        confirmations: response.data.confirmations,
        transactionHash: response.data.transaction_hash,
      };
    } catch (error) {
      throw new Error(`Crypto payment status check failed: ${error.message}`);
    }
  }
}

