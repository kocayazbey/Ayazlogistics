import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { notifications } from '../schema/core/notifications.schema';
import { users } from '../schema/core/users.schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

/**
 * Test için örnek veri üretici
 * Admin panel testleri için gerekli sample data oluşturur
 */
@Injectable()
export class SampleDataGenerator {
  private readonly logger = new Logger(SampleDataGenerator.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async generateSampleData() {
    this.logger.log('Örnek veriler oluşturuluyor...');

    // Kullanıcıları al
    const allUsers = await this.db.select().from(users);

    if (allUsers.length === 0) {
      this.logger.warn('Önce kullanıcılar oluşturulmalı!');
      return;
    }

    // Her kullanıcı için bildirimler oluştur
    for (const user of allUsers) {
      await this.generateNotificationsForUser(user.id);
    }

    this.logger.log('Örnek veriler başarıyla oluşturuldu!');
  }

  private async generateNotificationsForUser(userId: string) {
    const notificationTypes = [
      {
        type: 'info',
        title: 'Yeni Sipariş Geldi',
        message: 'ORD-2024-001 numaralı sipariş başarıyla oluşturuldu.',
      },
      {
        type: 'success',
        title: 'Depo İşlemi Tamamlandı',
        message: 'Stok sayımı başarıyla tamamlandı.',
      },
      {
        type: 'warning',
        title: 'Düşük Stok Uyarısı',
        message: 'PROD-123 ürünü için stok seviyesi kritik seviyeye düştü.',
      },
      {
        type: 'info',
        title: 'Rota Optimize Edildi',
        message: 'RT-001 rotası başarıyla optimize edildi.',
      },
      {
        type: 'success',
        title: 'Teslimat Tamamlandı',
        message: 'SHIP-456 teslimatı başarıyla tamamlandı.',
      },
      {
        type: 'warning',
        title: 'Araç Bakımı Gerekli',
        message: 'VEH-789 aracı için bakım zamanı geldi.',
      },
      {
        type: 'info',
        title: 'Yeni Müşteri Kaydı',
        message: 'Yeni müşteri sisteme eklendi.',
      },
      {
        type: 'success',
        title: 'Fatura Oluşturuldu',
        message: 'INV-2024-001 numaralı fatura oluşturuldu.',
      },
    ];

    // Her kullanıcı için 5-8 bildirim oluştur
    const count = Math.floor(Math.random() * 4) + 5;
    
    for (let i = 0; i < count; i++) {
      const notification = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const isRead = Math.random() > 0.5; // %50 okunmuş, %50 okunmamış

      await this.db.insert(notifications).values({
        userId,
        type: notification.type as 'info' | 'warning' | 'error' | 'success',
        title: notification.title,
        message: notification.message,
        isRead,
        data: {
          actionUrl: `/dashboard`,
          channels: ['in_app'],
        },
      });
    }

    this.logger.log(`${count} bildirim oluşturuldu (user: ${userId})`);
  }

  async clearSampleData() {
    this.logger.log('Örnek veriler temizleniyor...');
    
    // Test için oluşturulan bildirimleri sil
    await this.db.delete(notifications);
    
    this.logger.log('Örnek veriler temizlendi!');
  }
}

