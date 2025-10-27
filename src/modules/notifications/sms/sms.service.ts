import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SMSOptions {
  to: string | string[];
  message: string;
  sender?: string;
}

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private readonly netgsmUrl = 'https://api.netgsm.com.tr/sms/send/get';
  private readonly enabled: boolean;
  private readonly username: string;
  private readonly password: string;
  private readonly sender: string;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('NETGSM_USERNAME');
    this.password = this.configService.get<string>('NETGSM_PASSWORD');
    this.enabled = !!(this.username && this.password);
    this.sender = this.configService.get<string>('NETGSM_SENDER', 'AYAZLOJ');
    
    if (this.enabled) {
      this.logger.log('Netgsm SMS service configured successfully');
    } else {
      this.logger.warn('Netgsm credentials not found. SMS service disabled.');
    }
  }

  async sendSMS(options: SMSOptions): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to.join(',') : options.to;

    if (!this.enabled) {
      this.logger.warn(`SMS not sent (service disabled): ${options.message} to ${recipients}`);
      return;
    }

    const params = {
      usercode: this.username,
      password: this.password,
      gsmno: recipients,
      message: options.message,
      msgheader: options.sender || this.sender,
    };

    try {
      const response = await axios.get(this.netgsmUrl, { params });
      this.logger.log(`SMS sent successfully to ${recipients}`);
      
      if (response.data && response.data.startsWith('00')) {
        this.logger.log(`SMS delivery confirmed: ${response.data}`);
      } else {
        this.logger.warn(`SMS response: ${response.data}`);
      }
    } catch (error) {
      this.logger.error(`SMS sending failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendDeliveryNotification(phone: string, shipmentId: string, eta: string): Promise<void> {
    const message = `Your shipment ${shipmentId} will arrive in ${eta}. Track: ayazlogistics.com/track/${shipmentId}`;
    await this.sendSMS({ to: phone, message });
  }

  async sendAlertNotification(phone: string, alertMessage: string): Promise<void> {
    const message = `[ALERT] ${alertMessage} - AyazLogistics`;
    await this.sendSMS({ to: phone, message });
  }

  async sendOTP(phone: string, code: string): Promise<void> {
    const message = `Your AyazLogistics verification code is: ${code}. Valid for 10 minutes.`;
    await this.sendSMS({ to: phone, message });
  }
}

