import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NetgsmService {
  private readonly logger = new Logger(NetgsmService.name);
  private readonly apiUrl = 'https://api.netgsm.com.tr/sms/send/get';

  async sendSMS(phone: string, message: string): Promise<void> {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          usercode: process.env.NETGSM_USERNAME,
          password: process.env.NETGSM_PASSWORD,
          gsmno: phone.replace(/\D/g, ''),
          message: message,
          msgheader: process.env.NETGSM_SENDER || 'AYAZLOG',
          filter: 0,
        },
      });

      if (response.data.startsWith('00')) {
        this.logger.log(`SMS sent to ${phone}`);
      } else {
        throw new Error(`SMS failed: ${response.data}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phone}:`, error);
      throw error;
    }
  }

  async sendBulkSMS(phones: string[], message: string): Promise<void> {
    const phoneNumbers = phones.map(p => p.replace(/\D/g, '')).join(',');

    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          usercode: process.env.NETGSM_USERNAME,
          password: process.env.NETGSM_PASSWORD,
          gsmno: phoneNumbers,
          message: message,
          msgheader: process.env.NETGSM_SENDER || 'AYAZLOG',
          filter: 0,
        },
      });

      if (response.data.startsWith('00')) {
        this.logger.log(`Bulk SMS sent to ${phones.length} recipients`);
      } else {
        throw new Error(`Bulk SMS failed: ${response.data}`);
      }
    } catch (error) {
      this.logger.error('Failed to send bulk SMS:', error);
      throw error;
    }
  }
}

