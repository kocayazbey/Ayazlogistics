import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: any[];
  attachments?: any[];
  threadTs?: string;
}

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);
  private readonly client: AxiosInstance;
  private readonly botToken: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('SLACK_BOT_TOKEN') || '';

    this.client = axios.create({
      baseURL: 'https://slack.com/api',
      headers: {
        'Authorization': `Bearer ${this.botToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    try {
      const response = await this.client.post('/chat.postMessage', message);

      return response.data?.ok === true;
    } catch (error: any) {
      this.logger.error(`Slack message failed: ${error.message}`);
      return false;
    }
  }

  async sendOrderAlert(orderId: string, message: string, channel: string): Promise<void> {
    await this.sendMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📦 Order Alert',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Order ID:*\n${orderId}`,
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nAlert`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message,
          },
        },
      ],
    });
  }

  async sendShipmentNotification(
    trackingNumber: string,
    status: string,
    channel: string,
  ): Promise<void> {
    await this.sendMessage({
      channel,
      text: `🚚 Shipment Update: ${trackingNumber} - ${status}`,
    });
  }

  async sendInventoryAlert(
    productName: string,
    currentStock: number,
    threshold: number,
    channel: string,
  ): Promise<void> {
    await this.sendMessage({
      channel,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Low Stock Alert',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Product:*\n${productName}`,
            },
            {
              type: 'mrkdwn',
              text: `*Current Stock:*\n${currentStock}`,
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:*\n${threshold}`,
            },
          ],
        },
      ],
    });
  }
}

