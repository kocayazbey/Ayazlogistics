import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly client: AxiosInstance;
  private readonly botToken: string;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';

    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${this.botToken}`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  async sendMessage(chatId: string, text: string, parseMode?: 'Markdown' | 'HTML'): Promise<boolean> {
    try {
      const response = await this.client.post('/sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      });

      return response.data?.ok === true;
    } catch (error: any) {
      this.logger.error(`Telegram message failed: ${error.message}`);
      return false;
    }
  }

  async sendShipmentUpdate(chatId: string, trackingNumber: string, status: string): Promise<void> {
    const message = `🚚 *Shipment Update*\n\nTracking: \`${trackingNumber}\`\nStatus: ${status}`;
    await this.sendMessage(chatId, message, 'Markdown');
  }

  async sendInvoiceAlert(chatId: string, invoiceNumber: string, amount: number): Promise<void> {
    const message = `💰 *Invoice Generated*\n\nInvoice: \`${invoiceNumber}\`\nAmount: ${amount} TRY`;
    await this.sendMessage(chatId, message, 'Markdown');
  }
}

