import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class ReasonCodesService {
  private blockReasons: Map<string, any> = new Map();
  private rejectReasons: Map<string, any> = new Map();
  private cancellationReasons: Map<string, any> = new Map();
  private returnReasons: Map<string, any> = new Map();
  private transferReasons: Map<string, any> = new Map();

  constructor(private readonly eventBus: EventBusService) {
    this.initializeDefaultReasons();
  }

  private initializeDefaultReasons() {
    const blockReasons = [
      { code: 'BLK-01', name: 'Kalite Kontrolde', requiresInspection: true, autoRelease: false },
      { code: 'BLK-02', name: 'Hasar Tespit Edildi', requiresInspection: true, autoRelease: false },
      { code: 'BLK-03', name: 'Eksik Evrak', requiresInspection: false, autoRelease: false },
      { code: 'BLK-04', name: 'Müşteri Talebi', requiresInspection: false, autoRelease: false },
      { code: 'BLK-05', name: 'Gümrük Beklemede', requiresInspection: false, autoRelease: true },
      { code: 'BLK-06', name: 'Son Kullanma Tarihi Yakın', requiresInspection: true, autoRelease: false },
      { code: 'BLK-07', name: 'Miktar Uyuşmazlığı', requiresInspection: true, autoRelease: false },
      { code: 'BLK-08', name: 'Fatura Beklemede', requiresInspection: false, autoRelease: true },
      { code: 'BLK-09', name: 'Soruşturma Altında', requiresInspection: false, autoRelease: false },
      { code: 'BLK-10', name: 'Ödeme Bekleniyor', requiresInspection: false, autoRelease: true },
    ];

    const rejectReasons = [
      { code: 'REJ-01', name: 'Hasarlı Ürün', severity: 'high', requiresPhoto: true },
      { code: 'REJ-02', name: 'Yanlış Ürün', severity: 'medium', requiresPhoto: true },
      { code: 'REJ-03', name: 'Eksik Miktar', severity: 'medium', requiresPhoto: false },
      { code: 'REJ-04', name: 'Süresi Dolmuş', severity: 'high', requiresPhoto: true },
      { code: 'REJ-05', name: 'Kalite Standartlarına Uygun Değil', severity: 'high', requiresPhoto: true },
      { code: 'REJ-06', name: 'Sipariş İptal', severity: 'low', requiresPhoto: false },
      { code: 'REJ-07', name: 'Müsait Stok Yok', severity: 'medium', requiresPhoto: false },
      { code: 'REJ-08', name: 'Sevkiyat Gecikmesi', severity: 'low', requiresPhoto: false },
      { code: 'REJ-09', name: 'Hatalı Etiketleme', severity: 'medium', requiresPhoto: true },
      { code: 'REJ-10', name: 'Ambalaj Hasarlı', severity: 'medium', requiresPhoto: true },
    ];

    const cancellationReasons = [
      { code: 'CAN-01', name: 'Müşteri İsteği', refundable: true },
      { code: 'CAN-02', name: 'Stok Yetersizliği', refundable: true },
      { code: 'CAN-03', name: 'Fiyat Değişikliği', refundable: false },
      { code: 'CAN-04', name: 'Sipariş Hatası', refundable: true },
      { code: 'CAN-05', name: 'Teslimat Adresi Bulunamadı', refundable: true },
      { code: 'CAN-06', name: 'Ödeme Alınamadı', refundable: false },
      { code: 'CAN-07', name: 'Müşteri Ulaşılamadı', refundable: true },
      { code: 'CAN-08', name: 'Yasal Kısıtlama', refundable: true },
      { code: 'CAN-09', name: 'Sistem Hatası', refundable: true },
      { code: 'CAN-10', name: 'Duplicate Sipariş', refundable: true },
    ];

    blockReasons.forEach(r => this.blockReasons.set(r.code, r));
    rejectReasons.forEach(r => this.rejectReasons.set(r.code, r));
    cancellationReasons.forEach(r => this.cancellationReasons.set(r.code, r));
  }

  defineBlockReason(data: {
    code: string;
    name: string;
    requiresInspection: boolean;
    autoRelease: boolean;
    autoReleaseDays?: number;
  }, tenantId: string) {
    this.blockReasons.set(data.code, { ...data, tenantId, createdAt: new Date() });
    this.eventBus.emit('block.reason.defined', { code: data.code, tenantId });
    return this.blockReasons.get(data.code);
  }

  defineRejectReason(data: {
    code: string;
    name: string;
    severity: 'low' | 'medium' | 'high';
    requiresPhoto: boolean;
    requiresManagerApproval?: boolean;
  }, tenantId: string) {
    this.rejectReasons.set(data.code, { ...data, tenantId, createdAt: new Date() });
    this.eventBus.emit('reject.reason.defined', { code: data.code, tenantId });
    return this.rejectReasons.get(data.code);
  }

  defineReturnReason(data: {
    code: string;
    name: string;
    category: 'quality' | 'shipping' | 'customer' | 'other';
    refundEligible: boolean;
    restockFee?: number;
  }, tenantId: string) {
    this.returnReasons.set(data.code, { ...data, tenantId, createdAt: new Date() });
    this.eventBus.emit('return.reason.defined', { code: data.code, tenantId });
    return this.returnReasons.get(data.code);
  }

  defineTransferReason(data: {
    code: string;
    name: string;
    requiresApproval: boolean;
    auditRequired: boolean;
  }, tenantId: string) {
    this.transferReasons.set(data.code, { ...data, tenantId, createdAt: new Date() });
    this.eventBus.emit('transfer.reason.defined', { code: data.code, tenantId });
    return this.transferReasons.get(data.code);
  }

  getBlockReasons() {
    return Array.from(this.blockReasons.values());
  }

  getRejectReasons() {
    return Array.from(this.rejectReasons.values());
  }

  getReturnReasons() {
    return Array.from(this.returnReasons.values());
  }

  getCancellationReasons() {
    return Array.from(this.cancellationReasons.values());
  }

  getTransferReasons() {
    return Array.from(this.transferReasons.values());
  }
}

