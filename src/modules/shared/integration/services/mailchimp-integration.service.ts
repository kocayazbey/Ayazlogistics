import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MailchimpIntegrationService {
  private readonly apiKey = process.env.MAILCHIMP_API_KEY;
  private readonly serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  private readonly apiUrl = `https://${this.serverPrefix}.api.mailchimp.com/3.0`;

  async addSubscriber(
    listId: string,
    email: string,
    firstName: string,
    lastName: string,
    tenantId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/lists/${listId}/members`,
        {
          email_address: email,
          status: 'subscribed',
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Mailchimp add subscriber failed: ${error.message}`);
    }
  }

  async sendCampaign(
    listId: string,
    subject: string,
    content: string,
    tenantId: string,
  ): Promise<any> {
    try {
      const campaign = await axios.post(
        `${this.apiUrl}/campaigns`,
        {
          type: 'regular',
          recipients: { list_id: listId },
          settings: {
            subject_line: subject,
            from_name: 'Ayaz Logistics',
            reply_to: 'info@ayazlogistics.com',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      await axios.put(
        `${this.apiUrl}/campaigns/${campaign.data.id}/content`,
        { html: content },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      return campaign.data;
    } catch (error) {
      throw new Error(`Mailchimp campaign failed: ${error.message}`);
    }
  }
}

