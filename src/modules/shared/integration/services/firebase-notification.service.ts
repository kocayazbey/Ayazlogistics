import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseNotificationService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    this.messaging = admin.messaging();
  }

  async sendNotification(
    deviceToken: string,
    title: string,
    body: string,
    data?: any,
    tenantId?: string,
  ): Promise<void> {
    try {
      await this.messaging.send({
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data: data || {},
      });
    } catch (error) {
      throw new Error(`Firebase notification failed: ${error.message}`);
    }
  }

  async sendBulkNotification(
    tokens: string[],
    title: string,
    body: string,
    tenantId: string,
  ): Promise<{ success: number; failed: number }> {
    try {
      const response = await this.messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
      });

      return {
        success: response.successCount,
        failed: response.failureCount,
      };
    } catch (error) {
      throw new Error(`Firebase bulk notification failed: ${error.message}`);
    }
  }
}

