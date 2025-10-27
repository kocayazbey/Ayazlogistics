import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EtaErpService {
  private readonly apiUrl = process.env.ETA_ERP_API_URL;
  private readonly apiKey = process.env.ETA_ERP_API_KEY;

  async syncFinancialData(data: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/finance`,
        data,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Eta ERP sync failed: ${error.message}`);
    }
  }

  async createAccountingEntry(entry: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/muhasebe/kayit`,
        entry,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      throw new Error(`Eta accounting entry failed: ${error.message}`);
    }
  }
}

