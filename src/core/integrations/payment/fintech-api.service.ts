import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface BankTransfer {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  currency: string;
  reference: string;
  description: string;
  scheduledDate?: Date;
}

interface DirectDebit {
  mandateId: string;
  customerId: string;
  amount: number;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'cancelled' | 'expired';
}

interface VirtualAccount {
  accountId: string;
  customerId: string;
  accountNumber: string;
  balance: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
}

@Injectable()
export class FintechAPIService {
  private readonly logger = new Logger(FintechAPIService.name);
  private readonly apiUrl = process.env.FINTECH_API_URL || 'https://api.fintech.com';
  private readonly apiKey = process.env.FINTECH_API_KEY;

  async initiateTransfer(transfer: BankTransfer): Promise<{ transactionId: string; status: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/transfers`,
        {
          from_account: transfer.fromAccount,
          to_account: transfer.toAccount,
          amount: transfer.amount,
          currency: transfer.currency,
          reference: transfer.reference,
          description: transfer.description,
          scheduled_date: transfer.scheduledDate?.toISOString(),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Transfer initiated: ${response.data.transaction_id}`);

      return {
        transactionId: response.data.transaction_id,
        status: response.data.status,
      };
    } catch (error) {
      this.logger.error('Transfer failed:', error);
      throw error;
    }
  }

  async getAccountBalance(accountNumber: string): Promise<{ balance: number; currency: string; available: number }> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/accounts/${accountNumber}/balance`,
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        balance: response.data.balance,
        currency: response.data.currency,
        available: response.data.available_balance,
      };
    } catch (error) {
      this.logger.error('Balance check failed:', error);
      throw error;
    }
  }

  async getTransactionHistory(accountNumber: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/accounts/${accountNumber}/transactions`,
        {
          params: {
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
          },
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return response.data.transactions.map((tx: any) => ({
        id: tx.id,
        date: new Date(tx.date),
        amount: tx.amount,
        currency: tx.currency,
        type: tx.type,
        description: tx.description,
        balance: tx.balance_after,
      }));
    } catch (error) {
      this.logger.error('Transaction history failed:', error);
      return [];
    }
  }

  async createDirectDebitMandate(debit: DirectDebit): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/direct-debits/mandates`,
        {
          customer_id: debit.customerId,
          amount: debit.amount,
          frequency: debit.frequency,
          start_date: debit.startDate.toISOString(),
          end_date: debit.endDate?.toISOString(),
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`Direct debit mandate created: ${response.data.mandate_id}`);

      return response.data.mandate_id;
    } catch (error) {
      this.logger.error('Direct debit creation failed:', error);
      throw error;
    }
  }

  async createVirtualAccount(customerId: string, currency: string = 'TRY'): Promise<VirtualAccount> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/virtual-accounts`,
        {
          customer_id: customerId,
          currency,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const account: VirtualAccount = {
        accountId: response.data.account_id,
        customerId,
        accountNumber: response.data.account_number,
        balance: 0,
        currency,
        status: 'active',
      };

      this.logger.log(`Virtual account created: ${account.accountNumber}`);

      return account;
    } catch (error) {
      this.logger.error('Virtual account creation failed:', error);
      throw error;
    }
  }

  async verifyBankAccount(iban: string): Promise<{ valid: boolean; bankName?: string; accountHolder?: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/verify/iban`,
        { iban },
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return {
        valid: response.data.valid,
        bankName: response.data.bank_name,
        accountHolder: response.data.account_holder,
      };
    } catch (error) {
      this.logger.error('IBAN verification failed:', error);
      return { valid: false };
    }
  }

  async requestPaymentLink(amount: number, customerId: string, description: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/payment-links`,
        {
          amount,
          customer_id: customerId,
          description,
          callback_url: `${process.env.APP_URL}/webhooks/payment`,
        },
        {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
        }
      );

      return response.data.payment_url;
    } catch (error) {
      this.logger.error('Payment link creation failed:', error);
      throw error;
    }
  }
}

