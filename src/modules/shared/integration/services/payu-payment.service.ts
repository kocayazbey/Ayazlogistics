import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class PayuPaymentService {
  private readonly merchantId = process.env.PAYU_MERCHANT_ID;
  private readonly secretKey = process.env.PAYU_SECRET_KEY;
  private readonly apiUrl = 'https://secure.payu.com.tr/order/alu/v3';

  async createPayment(
    orderId: string,
    amount: number,
    currency: string,
    customerInfo: any,
    tenantId: string,
  ): Promise<any> {
    const params = {
      MERCHANT: this.merchantId,
      ORDER_REF: orderId,
      ORDER_DATE: new Date().toISOString(),
      ORDER_AMOUNT: amount,
      ORDER_CURRENCY: currency,
      BILL_LNAME: customerInfo.lastName,
      BILL_FNAME: customerInfo.firstName,
      BILL_EMAIL: customerInfo.email,
      BILL_PHONE: customerInfo.phone,
    };

    const signature = this.generateSignature(params);

    try {
      const response = await axios.post(
        this.apiUrl,
        { ...params, ORDER_HASH: signature },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Payu payment failed: ${error.message}`);
    }
  }

  private generateSignature(params: any): string {
    const signatureString = Object.values(params).join('') + this.secretKey;
    return crypto.createHash('md5').update(signatureString).digest('hex');
  }
}

