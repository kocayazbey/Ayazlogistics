import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class OpenBankingService {
  private readonly apiUrl = process.env.OPEN_BANKING_API_URL;
  private readonly clientId = process.env.OPEN_BANKING_CLIENT_ID;
  private readonly clientSecret = process.env.OPEN_BANKING_CLIENT_SECRET;

  async getAccountBalance(accountId: string, tenantId: string): Promise<any> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.apiUrl}/accounts/${accountId}/balances`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Open Banking balance query failed: ${error.message}`);
    }
  }

  async getTransactions(
    accountId: string,
    fromDate: Date,
    toDate: Date,
    tenantId: string,
  ): Promise<any[]> {
    const token = await this.getAccessToken();

    try {
      const response = await axios.get(
        `${this.apiUrl}/accounts/${accountId}/transactions`,
        {
          params: {
            fromBookingDateTime: fromDate.toISOString(),
            toBookingDateTime: toDate.toISOString(),
          },
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        },
      );

      return response.data.transactions || [];
    } catch (error) {
      throw new Error(`Open Banking transactions failed: ${error.message}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    const response = await axios.post(
      `${this.apiUrl}/token`,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      },
    );

    return response.data.access_token;
  }
}

