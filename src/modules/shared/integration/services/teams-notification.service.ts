import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface TeamsMessage {
  type: 'message';
  attachments: Array<{
    contentType: string;
    content: any;
  }>;
}

@Injectable()
export class TeamsNotificationService {
  private readonly logger = new Logger(TeamsNotificationService.name);
  private readonly webhookUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('TEAMS_WEBHOOK_URL') || '';
  }

  async sendMessage(title: string, text: string, facts?: Array<{ name: string; value: string }>): Promise<boolean> {
    try {
      const message = {
        type: 'message',
        attachments: [
          {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
              type: 'AdaptiveCard',
              version: '1.2',
              body: [
                {
                  type: 'TextBlock',
                  text: title,
                  weight: 'bolder',
                  size: 'medium',
                },
                {
                  type: 'TextBlock',
                  text: text,
                  wrap: true,
                },
                ...(facts ? [{
                  type: 'FactSet',
                  facts: facts.map(f => ({ title: f.name, value: f.value })),
                }] : []),
              ],
            },
          },
        ],
      };

      await axios.post(this.webhookUrl, message);

      return true;
    } catch (error: any) {
      this.logger.error(`Teams message failed: ${error.message}`);
      return false;
    }
  }

  async sendOrderAlert(orderId: string, message: string): Promise<void> {
    await this.sendMessage(
      '📦 Order Alert',
      message,
      [{ name: 'Order ID', value: orderId }],
    );
  }

  async sendShipmentNotification(trackingNumber: string, status: string): Promise<void> {
    await this.sendMessage(
      '🚚 Shipment Update',
      `Status: ${status}`,
      [{ name: 'Tracking Number', value: trackingNumber }],
    );
  }
}

