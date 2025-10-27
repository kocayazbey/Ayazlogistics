import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  async sendMessage(to: string, message: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      this.logger.log(`WhatsApp message sent to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`WhatsApp message failed to ${to}:`, error);
      throw error;
    }
  }

  async sendTemplate(to: string, templateName: string, parameters: any[]): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'tr' },
            components: [{ type: 'body', parameters }],
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      this.logger.log(`WhatsApp template sent to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`WhatsApp template failed to ${to}:`, error);
      throw error;
    }
  }

  async sendLocation(to: string, latitude: number, longitude: number, name: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'location',
          location: { latitude, longitude, name },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      this.logger.log(`WhatsApp location sent to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(`WhatsApp location failed to ${to}:`, error);
      throw error;
    }
  }
}

