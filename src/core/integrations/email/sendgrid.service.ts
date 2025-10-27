import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);

  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await sgMail.send({
        to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ayazlogistics.com',
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendBulkEmail(recipients: string[], subject: string, html: string): Promise<void> {
    const messages = recipients.map(to => ({
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ayazlogistics.com',
      subject,
      html,
    }));

    try {
      await sgMail.send(messages);
      this.logger.log(`Bulk email sent to ${recipients.length} recipients`);
    } catch (error) {
      this.logger.error('Failed to send bulk email:', error);
      throw error;
    }
  }
}

