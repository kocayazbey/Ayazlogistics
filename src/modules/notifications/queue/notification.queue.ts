import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

interface NotificationJob {
  type: 'email' | 'sms' | 'whatsapp' | 'push';
  recipient: string;
  data: any;
}

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue('notifications')
    private notificationQueue: Queue,
  ) {}

  async addEmailJob(to: string, subject: string, html: string, priority: number = 1): Promise<void> {
    await this.notificationQueue.add(
      'send-email',
      {
        type: 'email',
        recipient: to,
        data: { subject, html },
      },
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );
  }

  async addSMSJob(to: string, message: string, priority: number = 2): Promise<void> {
    await this.notificationQueue.add(
      'send-sms',
      {
        type: 'sms',
        recipient: to,
        data: { message },
      },
      {
        priority,
        attempts: 3,
      }
    );
  }

  async addWhatsAppJob(to: string, message: string, priority: number = 2): Promise<void> {
    await this.notificationQueue.add(
      'send-whatsapp',
      {
        type: 'whatsapp',
        recipient: to,
        data: { message },
      },
      {
        priority,
        attempts: 3,
      }
    );
  }

  async addBulkNotificationJob(notifications: NotificationJob[]): Promise<void> {
    const jobs = notifications.map((notification, index) => ({
      name: `send-${notification.type}`,
      data: notification,
      opts: {
        priority: 1,
        jobId: `bulk-${Date.now()}-${index}`,
      },
    }));

    await this.notificationQueue.addBulk(jobs);
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }
}

