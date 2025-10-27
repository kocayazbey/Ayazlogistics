import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class WhatsAppService {
  constructor(
    private configService: ConfigService,
    private eventBus: EventBusService,
  ) {}

  async sendMessage(data: {
    to: string;
    message: string;
    mediaUrl?: string;
  }) {
    const messageId = `WA-${Date.now()}`;

    await this.eventBus.emit('whatsapp.sent', {
      messageId,
      to: data.to,
      message: data.message,
    });

    return {
      messageId,
      status: 'sent',
      to: data.to,
      sentAt: new Date(),
    };
  }

  async sendTemplateMessage(to: string, templateName: string, parameters: string[]) {
    return this.sendMessage({
      to,
      message: `Template: ${templateName} with params: ${parameters.join(', ')}`,
    });
  }

  async sendDocument(to: string, documentUrl: string, caption?: string) {
    return this.sendMessage({
      to,
      message: caption || 'Document',
      mediaUrl: documentUrl,
    });
  }

  async sendLocation(to: string, latitude: number, longitude: number, name?: string) {
    return this.sendMessage({
      to,
      message: `Location: ${name || 'Location'} - ${latitude}, ${longitude}`,
    });
  }
}

