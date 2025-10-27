import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface FacebookPost {
  message: string;
  link?: string;
  imageUrl?: string;
  scheduledTime?: Date;
}

interface FacebookLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  formId: string;
  createdAt: Date;
}

interface FacebookInsights {
  pageId: string;
  period: 'day' | 'week' | 'month';
  metrics: {
    reach: number;
    impressions: number;
    engagement: number;
    followers: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

@Injectable()
export class FacebookAPIService {
  private readonly logger = new Logger(FacebookAPIService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly accessToken = process.env.FACEBOOK_ACCESS_TOKEN;

  async publishPost(pageId: string, post: FacebookPost): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${pageId}/feed`,
        {
          message: post.message,
          link: post.link,
          access_token: this.accessToken,
          published: !post.scheduledTime,
          scheduled_publish_time: post.scheduledTime ? Math.floor(post.scheduledTime.getTime() / 1000) : undefined,
        }
      );

      this.logger.log(`Facebook post published: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error('Facebook post failed:', error);
      throw error;
    }
  }

  async getLeads(formId: string): Promise<FacebookLead[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/${formId}/leads`, {
        params: { access_token: this.accessToken },
      });

      const leads = response.data.data.map((lead: any) => ({
        id: lead.id,
        name: lead.field_data.find((f: any) => f.name === 'full_name')?.values[0] || '',
        email: lead.field_data.find((f: any) => f.name === 'email')?.values[0] || '',
        phone: lead.field_data.find((f: any) => f.name === 'phone_number')?.values[0] || '',
        message: lead.field_data.find((f: any) => f.name === 'message')?.values[0] || '',
        formId,
        createdAt: new Date(lead.created_time),
      }));

      this.logger.log(`Retrieved ${leads.length} leads from Facebook`);
      return leads;
    } catch (error) {
      this.logger.error('Failed to get Facebook leads:', error);
      return [];
    }
  }

  async getPageInsights(pageId: string, period: FacebookInsights['period'] = 'day'): Promise<FacebookInsights> {
    try {
      const metrics = [
        'page_impressions',
        'page_engaged_users',
        'page_post_engagements',
        'page_fans',
      ];

      const response = await axios.get(`${this.apiUrl}/${pageId}/insights`, {
        params: {
          metric: metrics.join(','),
          period,
          access_token: this.accessToken,
        },
      });

      const data = response.data.data;

      return {
        pageId,
        period,
        metrics: {
          reach: data.find((m: any) => m.name === 'page_impressions')?.values[0]?.value || 0,
          impressions: data.find((m: any) => m.name === 'page_impressions')?.values[0]?.value || 0,
          engagement: data.find((m: any) => m.name === 'page_engaged_users')?.values[0]?.value || 0,
          followers: data.find((m: any) => m.name === 'page_fans')?.values[0]?.value || 0,
          likes: 0,
          comments: 0,
          shares: 0,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get page insights:', error);
      throw error;
    }
  }

  async respondToComment(commentId: string, message: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/${commentId}/comments`, {
        message,
        access_token: this.accessToken,
      });

      this.logger.log(`Responded to comment ${commentId}`);
    } catch (error) {
      this.logger.error('Failed to respond to comment:', error);
      throw error;
    }
  }

  async schedulePostCampaign(pageId: string, posts: FacebookPost[]): Promise<string[]> {
    const postIds: string[] = [];

    for (const post of posts) {
      try {
        const id = await this.publishPost(pageId, post);
        postIds.push(id);
      } catch (error) {
        this.logger.error('Campaign post failed:', error);
      }
    }

    this.logger.log(`Campaign scheduled: ${postIds.length}/${posts.length} posts successful`);
    return postIds;
  }
}

