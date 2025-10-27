import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class SmsService {
  constructor(
    private configService: ConfigService,
    private eventBus: EventBusService,
  ) {}

  async sendSms(data: {
    to: string | string[];
    message: string;
    sender?: string;
  }) {
    const smsId = `SMS-${Date.now()}`;

    await this.eventBus.emit('sms.sent', {
      smsId,
      to: data.to,
      message: data.message,
    });

    return {
      smsId,
      status: 'sent',
      to: data.to,
      message: data.message,
      sentAt: new Date(),
    };
  }

  async sendBulkSms(recipients: string[], message: string) {
    const results = [];

    for (const recipient of recipients) {
      const result = await this.sendSms({ to: recipient, message });
      results.push(result);
    }

    return results;
  }

  async sendOTP(phone: string, otp: string) {
    return this.sendSms({
      to: phone,
      message: `Your verification code is: ${otp}. Valid for 5 minutes.`,
    });
  }

  async sendDeliveryNotification(phone: string, trackingNumber: string, status: string) {
    return this.sendSms({
      to: phone,
      message: `Your shipment ${trackingNumber} is now ${status}. Track at: https://track.ayazlogistics.com/${trackingNumber}`,
    });
  }
}

