import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface WhatsAppMessageOptions {
  to: string;
  message: string;
  template?: string;
  params?: any[];
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL', 'https://graph.facebook.com/v18.0');
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    this.enabled = !!(this.phoneNumberId && this.accessToken);
    
    if (this.enabled) {
      this.logger.log('WhatsApp Business API configured successfully');
    } else {
      this.logger.warn('WhatsApp credentials not found. WhatsApp service disabled.');
    }
  }

  async sendMessage(options: WhatsAppMessageOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`WhatsApp not sent (service disabled): ${options.message} to ${options.to}`);
      return;
    }

    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: options.to,
      type: 'text',
      text: {
        body: options.message,
      },
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`WhatsApp message sent successfully to ${options.to}`);
      this.logger.debug(`Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      this.logger.error(`WhatsApp sending failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    params: any[]
  ): Promise<void> {
    const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'tr',
        },
        components: [
          {
            type: 'body',
            parameters: params.map((p) => ({ type: 'text', text: p })),
          },
        ],
      },
    };

    try {
      await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('WhatsApp template sending failed:', error);
      throw error;
    }
  }

  async sendDeliveryUpdate(phone: string, shipmentId: string, status: string): Promise<void> {
    const message = `🚚 Shipment Update\n\nID: ${shipmentId}\nStatus: ${status}\n\nTrack: ayazlogistics.com/track/${shipmentId}`;
    await this.sendMessage({ to: phone, message });
  }

  async sendInvoiceNotification(phone: string, invoiceNumber: string, amount: string): Promise<void> {
    const message = `📄 New Invoice\n\nInvoice: ${invoiceNumber}\nAmount: ${amount}\n\nView: ayazlogistics.com/invoices/${invoiceNumber}`;
    await this.sendMessage({ to: phone, message });
  }
}

