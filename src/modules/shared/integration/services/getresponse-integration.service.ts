import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GetResponseIntegrationService {
  private readonly apiKey = process.env.GETRESPONSE_API_KEY;
  private readonly apiUrl = 'https://api.getresponse.com/v3';

  async addContact(
    campaignId: string,
    email: string,
    name: string,
    customFields: any,
    tenantId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/contacts`,
        {
          email,
          campaign: { campaignId },
          name,
          customFieldValues: customFields,
        },
        {
          headers: {
            'X-Auth-Token': `api-key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`GetResponse add contact failed: ${error.message}`);
    }
  }

  async sendNewsletter(
    campaignId: string,
    subject: string,
    content: string,
    tenantId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/newsletters`,
        {
          campaign: { campaignId },
          subject,
          content: { html: content },
          sendOn: new Date().toISOString(),
        },
        {
          headers: {
            'X-Auth-Token': `api-key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`GetResponse newsletter failed: ${error.message}`);
    }
  }
}

