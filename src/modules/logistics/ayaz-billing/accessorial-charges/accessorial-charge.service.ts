import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface AccessorialCharge {
  id: string;
  chargeType: string;
  chargeName: string;
  description: string;
  pricingType: 'flat' | 'per_hour' | 'per_day' | 'per_unit' | 'percentage';
  amount: number;
  minimumCharge?: number;
  maximumCharge?: number;
  applicableConditions?: any;
}

interface ChargeCalculation {
  chargeType: string;
  chargeName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  description: string;
}

interface AccessorialChargeRequest {
  contractId: string;
  chargeType: string;
  quantity?: number;
  baseAmount?: number;
  metadata?: any;
}

@Injectable()
export class AccessorialChargeService {
  private readonly chargeDefinitions: AccessorialCharge[] = [
    {
      id: '1',
      chargeType: 'detention',
      chargeName: 'Araç Bekleme Ücreti',
      description: 'Yükleme/boşaltma sırasında araç bekleme süresi',
      pricingType: 'per_hour',
      amount: 250,
      minimumCharge: 0,
    },
    {
      id: '2',
      chargeType: 'appointment_delivery',
      chargeName: 'Randevulu Teslimat',
      description: 'Belirli bir zaman diliminde teslimat hizmeti',
      pricingType: 'flat',
      amount: 500,
    },
    {
      id: '3',
      chargeType: 'liftgate_service',
      chargeName: 'Liftgate Hizmeti',
      description: 'Hidrolik kapak kullanılarak yükleme/boşaltma',
      pricingType: 'per_unit',
      amount: 150,
    },
    {
      id: '4',
      chargeType: 'residential_delivery',
      chargeName: 'Konut Teslimatı',
      description: 'Konut adresine teslimat ek ücreti',
      pricingType: 'flat',
      amount: 750,
    },
    {
      id: '5',
      chargeType: 'inside_delivery',
      chargeName: 'İçeri Teslimat',
      description: 'Ürünün müşteri binasına taşınması',
      pricingType: 'per_unit',
      amount: 100,
    },
    {
      id: '6',
      chargeType: 'special_packaging',
      chargeName: 'Özel Paketleme',
      description: 'Hassas ürünler için özel paketleme',
      pricingType: 'per_unit',
      amount: 200,
      minimumCharge: 500,
    },
    {
      id: '7',
      chargeType: 'temperature_controlled',
      chargeName: 'Sıcaklık Kontrollü Taşıma',
      description: 'Soğutmalı veya ısıtmalı taşıma hizmeti',
      pricingType: 'percentage',
      amount: 15,
    },
    {
      id: '8',
      chargeType: 'hazmat_handling',
      chargeName: 'Tehlikeli Madde Taşıma',
      description: 'ADR gerektiren malzeme taşıma',
      pricingType: 'percentage',
      amount: 25,
      minimumCharge: 1000,
    },
    {
      id: '9',
      chargeType: 'oversized_freight',
      chargeName: 'Aşırı Boyutlu Yük',
      description: 'Standart ölçüleri aşan yük taşıma',
      pricingType: 'percentage',
      amount: 20,
    },
    {
      id: '10',
      chargeType: 'redelivery',
      chargeName: 'Yeniden Teslimat',
      description: 'Başarısız teslimat sonrası yeniden gönderim',
      pricingType: 'flat',
      amount: 400,
    },
    {
      id: '11',
      chargeType: 'after_hours',
      chargeName: 'Mesai Dışı Hizmet',
      description: 'Normal çalışma saatleri dışında operasyon',
      pricingType: 'percentage',
      amount: 30,
      minimumCharge: 500,
    },
    {
      id: '12',
      chargeType: 'sorting_segregation',
      chargeName: 'Ayırma ve Sınıflandırma',
      description: 'Ürünlerin sınıflandırılması ve ayrılması',
      pricingType: 'per_unit',
      amount: 25,
    },
    {
      id: '13',
      chargeType: 'pallet_exchange',
      chargeName: 'Palet Değişimi',
      description: 'Müşteri paleti ile firma paleti değişimi',
      pricingType: 'per_unit',
      amount: 50,
    },
    {
      id: '14',
      chargeType: 'storage_overage',
      chargeName: 'Fazla Depolama',
      description: 'Sözleşmeli depolama limitini aşma',
      pricingType: 'per_day',
      amount: 10,
    },
    {
      id: '15',
      chargeType: 'rush_order',
      chargeName: 'Acil Sipariş',
      description: 'Acil işlem önceliği',
      pricingType: 'percentage',
      amount: 50,
      minimumCharge: 1000,
    },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async calculateAccessorialCharge(
    request: AccessorialChargeRequest,
  ): Promise<ChargeCalculation> {
    const chargeDefinition = this.chargeDefinitions.find(
      (c) => c.chargeType === request.chargeType,
    );

    if (!chargeDefinition) {
      throw new Error(`Unknown charge type: ${request.chargeType}`);
    }

    let totalAmount = 0;
    let unitPrice = chargeDefinition.amount;
    const quantity = request.quantity || 1;

    switch (chargeDefinition.pricingType) {
      case 'flat':
        totalAmount = chargeDefinition.amount;
        break;

      case 'per_hour':
      case 'per_day':
      case 'per_unit':
        totalAmount = chargeDefinition.amount * quantity;
        break;

      case 'percentage':
        if (!request.baseAmount) {
          throw new Error('Base amount required for percentage-based charge');
        }
        totalAmount = (request.baseAmount * chargeDefinition.amount) / 100;
        unitPrice = (request.baseAmount * chargeDefinition.amount) / 100;
        break;
    }

    if (chargeDefinition.minimumCharge && totalAmount < chargeDefinition.minimumCharge) {
      totalAmount = chargeDefinition.minimumCharge;
    }

    if (chargeDefinition.maximumCharge && totalAmount > chargeDefinition.maximumCharge) {
      totalAmount = chargeDefinition.maximumCharge;
    }

    await this.eventBus.publish('billing.accessorial_charge.calculated', {
      contractId: request.contractId,
      chargeType: request.chargeType,
      totalAmount,
      quantity,
    });

    return {
      chargeType: chargeDefinition.chargeType,
      chargeName: chargeDefinition.chargeName,
      quantity,
      unitPrice,
      totalAmount,
      description: chargeDefinition.description,
    };
  }

  async calculateMultipleCharges(
    requests: AccessorialChargeRequest[],
  ): Promise<{
    charges: ChargeCalculation[];
    subtotal: number;
    totalCharges: number;
  }> {
    const charges: ChargeCalculation[] = [];
    let subtotal = 0;

    for (const request of requests) {
      const charge = await this.calculateAccessorialCharge(request);
      charges.push(charge);
      subtotal += charge.totalAmount;
    }

    return {
      charges,
      subtotal,
      totalCharges: charges.length,
    };
  }

  async getAvailableCharges(): Promise<AccessorialCharge[]> {
    return this.chargeDefinitions;
  }

  async getChargeDefinition(chargeType: string): Promise<AccessorialCharge | null> {
    return this.chargeDefinitions.find((c) => c.chargeType === chargeType) || null;
  }

  async getChargesByCategory(): Promise<
    Array<{
      category: string;
      charges: AccessorialCharge[];
    }>
  > {
    return [
      {
        category: 'Delivery Services',
        charges: this.chargeDefinitions.filter((c) =>
          ['appointment_delivery', 'residential_delivery', 'inside_delivery', 'redelivery'].includes(
            c.chargeType,
          ),
        ),
      },
      {
        category: 'Equipment & Handling',
        charges: this.chargeDefinitions.filter((c) =>
          ['liftgate_service', 'special_packaging', 'pallet_exchange'].includes(c.chargeType),
        ),
      },
      {
        category: 'Specialty Services',
        charges: this.chargeDefinitions.filter((c) =>
          ['temperature_controlled', 'hazmat_handling', 'oversized_freight'].includes(c.chargeType),
        ),
      },
      {
        category: 'Time-Based Charges',
        charges: this.chargeDefinitions.filter((c) =>
          ['detention', 'after_hours', 'storage_overage', 'rush_order'].includes(c.chargeType),
        ),
      },
      {
        category: 'Value-Added Services',
        charges: this.chargeDefinitions.filter((c) =>
          ['sorting_segregation'].includes(c.chargeType),
        ),
      },
    ];
  }

  async createCustomCharge(
    tenantId: string,
    contractId: string,
    data: {
      chargeType: string;
      chargeName: string;
      description: string;
      pricingType: 'flat' | 'per_hour' | 'per_day' | 'per_unit' | 'percentage';
      amount: number;
      minimumCharge?: number;
      maximumCharge?: number;
    },
  ): Promise<AccessorialCharge> {
    const customCharge: AccessorialCharge = {
      id: crypto.randomUUID(),
      ...data,
    };

    await this.eventBus.publish('billing.custom_accessorial_charge.created', {
      tenantId,
      contractId,
      chargeType: data.chargeType,
    });

    return customCharge;
  }

  async generateAccessorialReport(
    contractId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { startDate: Date; endDate: Date };
    totalCharges: number;
    totalAmount: number;
    breakdown: Array<{
      chargeType: string;
      chargeName: string;
      count: number;
      totalAmount: number;
    }>;
  }> {
    const mockData = [
      { chargeType: 'detention', chargeName: 'Araç Bekleme Ücreti', count: 15, totalAmount: 3750 },
      { chargeType: 'special_packaging', chargeName: 'Özel Paketleme', count: 25, totalAmount: 5000 },
      { chargeType: 'after_hours', chargeName: 'Mesai Dışı Hizmet', count: 8, totalAmount: 4000 },
      { chargeType: 'liftgate_service', chargeName: 'Liftgate Hizmeti', count: 30, totalAmount: 4500 },
    ];

    const totalAmount = mockData.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalCharges = mockData.reduce((sum, item) => sum + item.count, 0);

    return {
      period: { startDate, endDate },
      totalCharges,
      totalAmount,
      breakdown: mockData,
    };
  }

  async validateAccessorialCharge(
    chargeType: string,
    contractId: string,
  ): Promise<{
    isValid: boolean;
    isAllowed: boolean;
    message?: string;
  }> {
    const chargeDefinition = this.chargeDefinitions.find((c) => c.chargeType === chargeType);

    if (!chargeDefinition) {
      return {
        isValid: false,
        isAllowed: false,
        message: 'Charge type not found',
      };
    }

    return {
      isValid: true,
      isAllowed: true,
      message: 'Charge is valid and allowed',
    };
  }

  async getChargeHistory(
    contractId: string,
    chargeType?: string,
  ): Promise<
    Array<{
      date: Date;
      chargeType: string;
      chargeName: string;
      quantity: number;
      amount: number;
    }>
  > {
    return [
      {
        date: new Date('2024-01-15'),
        chargeType: 'detention',
        chargeName: 'Araç Bekleme Ücreti',
        quantity: 2,
        amount: 500,
      },
      {
        date: new Date('2024-01-20'),
        chargeType: 'special_packaging',
        chargeName: 'Özel Paketleme',
        quantity: 5,
        amount: 1000,
      },
    ];
  }
}

