import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface BankTransaction {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  description: string;
  type: 'debit' | 'credit';
  balance: number;
  reference: string;
}

interface PaymentOrder {
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  toName: string;
  description: string;
}

@Injectable()
export class BankAPIService {
  private readonly logger = new Logger(BankAPIService.name);
  private readonly apiUrl = process.env.BANK_API_URL || '';

  async getAccountBalance(accountNumber: string): Promise<{ balance: number; currency: string }> {
    try {
      const response = await axios.get(`${this.apiUrl}/accounts/${accountNumber}/balance`, {
        headers: this.getHeaders(),
      });

      this.logger.log(`Balance retrieved for account ${accountNumber}`);
      return {
        balance: response.data.balance,
        currency: response.data.currency,
      };
    } catch (error) {
      this.logger.error(`Balance retrieval failed for ${accountNumber}:`, error);
      throw error;
    }
  }

  async getTransactions(
    accountNumber: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BankTransaction[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/accounts/${accountNumber}/transactions`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        headers: this.getHeaders(),
      });

      this.logger.log(`Retrieved ${response.data.transactions.length} transactions`);
      return response.data.transactions.map((t: any) => ({
        id: t.id,
        date: new Date(t.date),
        amount: t.amount,
        currency: t.currency,
        description: t.description,
        type: t.type,
        balance: t.balance,
        reference: t.reference,
      }));
    } catch (error) {
      this.logger.error('Transaction retrieval failed:', error);
      throw error;
    }
  }

  async initiatePayment(payment: PaymentOrder): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/payments`, payment, {
        headers: this.getHeaders(),
      });

      this.logger.log(`Payment initiated: ${response.data.transactionId}`);
      return response.data.transactionId;
    } catch (error) {
      this.logger.error('Payment initiation failed:', error);
      throw error;
    }
  }

  async verifyIBAN(iban: string): Promise<{ valid: boolean; bankName?: string; accountHolder?: string }> {
    try {
      const response = await axios.get(`${this.apiUrl}/verify-iban`, {
        params: { iban },
        headers: this.getHeaders(),
      });

      return {
        valid: response.data.valid,
        bankName: response.data.bankName,
        accountHolder: response.data.accountHolder,
      };
    } catch (error) {
      this.logger.error(`IBAN verification failed for ${iban}:`, error);
      return { valid: false };
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${process.env.BANK_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }
}

