import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class EmailService {
  constructor(
    private configService: ConfigService,
    private eventBus: EventBusService,
  ) {}

  async sendEmail(data: {
    to: string | string[];
    subject: string;
    body: string;
    html?: string;
    from?: string;
    attachments?: Array<{ filename: string; path: string }>;
  }) {
    const emailId = `EMAIL-${Date.now()}`;

    await this.eventBus.emit('email.sent', {
      emailId,
      to: data.to,
      subject: data.subject,
    });

    return {
      emailId,
      status: 'sent',
      to: data.to,
      subject: data.subject,
      sentAt: new Date(),
    };
  }

  async sendTemplateEmail(templateName: string, to: string, variables: Record<string, any>) {
    return this.sendEmail({
      to,
      subject: `Template: ${templateName}`,
      body: JSON.stringify(variables),
    });
  }

  async sendBulkEmail(recipients: Array<{ email: string; variables: Record<string, any> }>, template: string) {
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendTemplateEmail(template, recipient.email, recipient.variables);
      results.push(result);
    }

    return results;
  }

  async sendNotificationEmail(to: string, notification: {
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    return this.sendEmail({
      to,
      subject: notification.title,
      body: notification.message,
      html: `
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.actionUrl ? `<a href="${notification.actionUrl}">View Details</a>` : ''}
      `,
    });
  }
}

