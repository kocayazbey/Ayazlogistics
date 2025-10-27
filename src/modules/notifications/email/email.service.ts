import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    type?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;
  private readonly defaultFrom: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.enabled = !!apiKey;
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM', 'noreply@ayazlogistics.com');
    
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.logger.log('SendGrid configured successfully');
    } else {
      this.logger.warn('SendGrid API key not found. Email service disabled.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`Email not sent (service disabled): ${options.subject} to ${options.to}`);
      return;
    }

    const msg = {
      to: options.to,
      from: options.from || this.defaultFrom,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Email sent successfully to ${options.to}`);
    } catch (error) {
      this.logger.error(`Email sending failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendInvoiceEmail(to: string, invoiceData: any): Promise<void> {
    const html = this.getInvoiceTemplate(invoiceData);
    await this.sendEmail({
      to,
      subject: `Invoice ${invoiceData.invoiceNumber} - AyazLogistics`,
      html,
    });
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const html = `
      <h1>Welcome to AyazLogistics, ${userName}!</h1>
      <p>Your account has been created successfully.</p>
      <p>You can now access your dashboard and start managing your logistics operations.</p>
    `;
    await this.sendEmail({
      to,
      subject: 'Welcome to AyazLogistics',
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
    `;
    await this.sendEmail({
      to,
      subject: 'Password Reset - AyazLogistics',
      html,
    });
  }

  private getInvoiceTemplate(invoiceData: any): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Invoice ${invoiceData.invoiceNumber}</h1>
        <p>Date: ${invoiceData.invoiceDate}</p>
        <p>Due Date: ${invoiceData.dueDate}</p>
        <hr />
        <h2>Amount: ${invoiceData.totalAmount} ${invoiceData.currency}</h2>
        <p>Thank you for your business!</p>
      </div>
    `;
  }
}

