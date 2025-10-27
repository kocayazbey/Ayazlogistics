import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class MovementTypesService {
  private movementTypes: Map<string, any> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  initializeStandardMovementTypes() {
    const types = [
      { code: '01', name: 'Satınalma Girişi', category: 'inbound', requiresApproval: false },
      { code: '02', name: 'Üretimden Giriş', category: 'inbound', requiresApproval: true },
      { code: '03', name: 'İade Girişi', category: 'inbound', requiresApproval: true },
      { code: '04', name: 'Transfer Girişi', category: 'inbound', requiresApproval: false },
      { code: '05', name: 'Sayım Fazlası', category: 'adjustment', requiresApproval: true },
      { code: '06', name: 'Depolar Arası Giriş', category: 'transfer', requiresApproval: false },
      { code: '07', name: 'Fire İadesi', category: 'adjustment', requiresApproval: true },
      { code: '08', name: 'Müşteriden İade', category: 'inbound', requiresApproval: true },
      { code: '09', name: 'Tedarikçi Değişim', category: 'adjustment', requiresApproval: true },
      { code: '10', name: 'Üretime Sevk', category: 'outbound', requiresApproval: false },
      { code: '11', name: 'Satış Çıkışı', category: 'outbound', requiresApproval: false },
      { code: '12', name: 'Transfer Çıkışı', category: 'outbound', requiresApproval: false },
      { code: '13', name: 'Fire Çıkışı', category: 'outbound', requiresApproval: true },
      { code: '14', name: 'Sayım Eksiği', category: 'adjustment', requiresApproval: true },
      { code: '15', name: 'Depolar Arası Çıkış', category: 'transfer', requiresApproval: false },
      { code: '16', name: 'Hurda/İmha', category: 'outbound', requiresApproval: true },
      { code: '17', name: 'Numune Çıkışı', category: 'outbound', requiresApproval: true },
      { code: '18', name: 'Promosyon Çıkışı', category: 'outbound', requiresApproval: false },
      { code: '19', name: 'Garanti İadesi', category: 'outbound', requiresApproval: true },
      { code: '20', name: 'Konsinye Giriş', category: 'inbound', requiresApproval: false },
      { code: '21', name: 'Konsinye Çıkış', category: 'outbound', requiresApproval: false },
      { code: '22', name: 'Emanet Giriş', category: 'inbound', requiresApproval: false },
      { code: '23', name: 'Emanet Çıkış', category: 'outbound', requiresApproval: false },
      { code: '24', name: 'Yeniden İşleme Girişi', category: 'inbound', requiresApproval: true },
      { code: '25', name: 'Yeniden İşleme Çıkışı', category: 'outbound', requiresApproval: true },
      { code: '26', name: 'Kiralama Girişi', category: 'inbound', requiresApproval: false },
      { code: '27', name: 'Kiralama Çıkışı', category: 'outbound', requiresApproval: false },
      { code: '28', name: 'Bakım/Onarım Çıkışı', category: 'outbound', requiresApproval: true },
      { code: '29', name: 'Bakım/Onarım Girişi', category: 'inbound', requiresApproval: true },
      { code: '30', name: 'Kalite Kontrol Çıkışı', category: 'internal', requiresApproval: false },
      { code: '31', name: 'Kalite Kontrol Girişi', category: 'internal', requiresApproval: false },
      { code: '32', name: 'Karantina Girişi', category: 'internal', requiresApproval: true },
      { code: '33', name: 'Karantina Çıkışı', category: 'internal', requiresApproval: true },
      { code: '34', name: 'Cross-Dock Girişi', category: 'crossdock', requiresApproval: false },
      { code: '35', name: 'Cross-Dock Çıkışı', category: 'crossdock', requiresApproval: false },
      { code: '36', name: 'Rezerv Alan Girişi', category: 'transfer', requiresApproval: false },
      { code: '37', name: 'Rezerv Alan Çıkışı', category: 'transfer', requiresApproval: false },
      { code: '38', name: 'Toplama Alanı Girişi', category: 'transfer', requiresApproval: false },
      { code: '39', name: 'Toplama Alanı Çıkışı', category: 'transfer', requiresApproval: false },
      { code: '40', name: 'Paketleme Girişi', category: 'internal', requiresApproval: false },
      { code: '41', name: 'Paketleme Çıkışı', category: 'internal', requiresApproval: false },
      { code: '42', name: 'Palet Birleştirme', category: 'adjustment', requiresApproval: false },
      { code: '43', name: 'Palet Bölme', category: 'adjustment', requiresApproval: false },
      { code: '44', name: 'Karma Palet Oluşturma', category: 'adjustment', requiresApproval: false },
      { code: '45', name: 'Lokasyon Değişikliği', category: 'transfer', requiresApproval: false },
      { code: '46', name: 'Repack İşlemi', category: 'adjustment', requiresApproval: false },
      { code: '47', name: 'Kitting Oluşturma', category: 'assembly', requiresApproval: false },
      { code: '48', name: 'Kitting Dağıtma', category: 'disassembly', requiresApproval: false },
      { code: '49', name: 'Lot Değişikliği', category: 'adjustment', requiresApproval: true },
      { code: '50', name: 'Seri No Değişikliği', category: 'adjustment', requiresApproval: true },
      { code: '51', name: 'Tamir Girişi', category: 'inbound', requiresApproval: true },
      { code: '52', name: 'Tamir Çıkışı', category: 'outbound', requiresApproval: true },
      { code: '53', name: 'Dönem Sonu Sayımı', category: 'count', requiresApproval: true },
      { code: '54', name: 'Spot Sayım', category: 'count', requiresApproval: false },
      { code: '55', name: 'Periyodik Sayım', category: 'count', requiresApproval: false },
      { code: '56', name: 'Dinamik Sayım', category: 'count', requiresApproval: false },
      { code: '57', name: 'İkmal İşlemi', category: 'replenishment', requiresApproval: false },
      { code: '58', name: 'Manuel Besleme', category: 'replenishment', requiresApproval: false },
      { code: '59', name: 'Otomatik İkmal', category: 'replenishment', requiresApproval: false },
      { code: '60', name: 'Wave Toplama', category: 'picking', requiresApproval: false },
      { code: '61', name: 'Batch Toplama', category: 'picking', requiresApproval: false },
      { code: '62', name: 'Zone Toplama', category: 'picking', requiresApproval: false },
      { code: '63', name: 'Cluster Toplama', category: 'picking', requiresApproval: false },
      { code: '64', name: 'Voice Toplama', category: 'picking', requiresApproval: false },
      { code: '65', name: 'RFID Okuma', category: 'tracking', requiresApproval: false },
      { code: '66', name: 'AGV Taşıma', category: 'automation', requiresApproval: false },
      { code: '67', name: 'Konveyör Hareketi', category: 'automation', requiresApproval: false },
      { code: '68', name: 'Otomatik Depolama', category: 'automation', requiresApproval: false },
      { code: '69', name: 'Otomatik Çıkış', category: 'automation', requiresApproval: false },
      { code: '70', name: 'Manuel Düzeltme', category: 'adjustment', requiresApproval: true },
      { code: '71', name: 'Sistem Entegrasyonu', category: 'integration', requiresApproval: false },
    ];

    types.forEach(type => {
      this.movementTypes.set(type.code, type);
    });
  }

  async defineMovementType(data: {
    code: string;
    name: string;
    category: string;
    requiresApproval: boolean;
    impactsInventory: boolean;
    impactType?: 'increase' | 'decrease' | 'neutral';
    allowedStatuses?: string[];
  }, tenantId: string) {
    this.movementTypes.set(data.code, {
      ...data,
      tenantId,
      createdAt: new Date(),
    });

    await this.eventBus.emit('movement.type.defined', { code: data.code, name: data.name, tenantId });

    return this.movementTypes.get(data.code);
  }

  getMovementType(code: string) {
    return this.movementTypes.get(code);
  }

  getAllMovementTypes(category?: string) {
    const all = Array.from(this.movementTypes.values());
    if (category) {
      return all.filter(t => t.category === category);
    }
    return all;
  }
}

