import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class GibEFaturaService {
  private readonly logger = new Logger(GibEFaturaService.name);
  private readonly apiUrl = process.env.GIB_E_INVOICE_ENVIRONMENT === 'production'
    ? 'https://efatura.gib.gov.tr/earsiv-services'
    : 'https://efaturatest.gib.gov.tr/earsiv-services';

  async sendInvoice(invoiceData: any): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/dispatch`, {
        ...invoiceData,
        senderAlias: process.env.GIB_E_INVOICE_ALIAS,
      }, {
        auth: {
          username: process.env.GIB_E_INVOICE_USERNAME || '',
          password: process.env.GIB_E_INVOICE_PASSWORD || '',
        },
        headers: { 'Content-Type': 'application/xml' },
      });
      this.logger.log(`E-Fatura sent: ${response.data.uuid}`);
      return response.data;
    } catch (error) {
      this.logger.error('E-Fatura send failed:', error);
      throw error;
    }
  }

  async getInvoiceStatus(uuid: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/status/${uuid}`, {
        auth: {
          username: process.env.GIB_E_INVOICE_USERNAME || '',
          password: process.env.GIB_E_INVOICE_PASSWORD || '',
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`E-Fatura status check failed for ${uuid}:`, error);
      throw error;
    }
  }

  async downloadInvoice(uuid: string): Promise<Buffer> {
    try {
      const response = await axios.get(`${this.apiUrl}/download/${uuid}`, {
        auth: {
          username: process.env.GIB_E_INVOICE_USERNAME || '',
          password: process.env.GIB_E_INVOICE_PASSWORD || '',
        },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`E-Fatura download failed for ${uuid}:`, error);
      throw error;
    }
  }

  async cancelInvoice(uuid: string, reason: string): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/cancel`, 
        { uuid, reason },
        {
          auth: {
            username: process.env.GIB_E_INVOICE_USERNAME || '',
            password: process.env.GIB_E_INVOICE_PASSWORD || '',
          },
        }
      );
      this.logger.log(`E-Fatura cancelled: ${uuid}`);
      return response.data;
    } catch (error) {
      this.logger.error(`E-Fatura cancellation failed for ${uuid}:`, error);
      throw error;
    }
  }
}

