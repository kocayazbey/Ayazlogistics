import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ForwardingShipment {
  id: string;
  customerId: string;
  origin: string;
  destination: string;
  incoterm: 'EXW' | 'FOB' | 'CIF' | 'DDP' | 'DAP';
  mode: 'sea' | 'air' | 'road' | 'multimodal';
  serviceType: 'fcl' | 'lcl' | 'ftl' | 'ltl' | 'express';
  commodityType: string;
  hsCode?: string;
  value: number;
  currency: string;
  requiresCustomsClearance: boolean;
  requiresInsurance: boolean;
  specialHandling?: string[];
}

interface CommissionRate {
  serviceType: string;
  mode: string;
  commissionPercentage: number;
  minimumCommission: number;
  maximumCommission?: number;
}

@Injectable()
export class ForwarderService {
  private commissionRates: CommissionRate[] = [
    { serviceType: 'fcl', mode: 'sea', commissionPercentage: 15, minimumCommission: 5000 },
    { serviceType: 'lcl', mode: 'sea', commissionPercentage: 18, minimumCommission: 2500 },
    { serviceType: 'express', mode: 'air', commissionPercentage: 12, minimumCommission: 3000 },
    { serviceType: 'economy', mode: 'air', commissionPercentage: 15, minimumCommission: 2000 },
    { serviceType: 'ftl', mode: 'road', commissionPercentage: 10, minimumCommission: 1500 },
    { serviceType: 'ltl', mode: 'road', commissionPercentage: 12, minimumCommission: 800 },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createForwardingShipment(data: ForwardingShipment): Promise<any> {
    const shipmentId = `FWD-${Date.now()}`;
    
    const workflow = await this.initializeForwardingWorkflow(data);
    
    await this.eventBus.publish('forwarding.shipment.created', {
      shipmentId,
      customerId: data.customerId,
      mode: data.mode,
      incoterm: data.incoterm
    });

    return {
      shipmentId,
      status: 'pending_booking',
      workflow,
      estimatedCost: await this.estimateForwardingCost(data),
      requiredDocuments: this.getRequiredDocuments(data),
      nextSteps: workflow.steps.filter((s: any) => s.status === 'pending')
    };
  }

  private async initializeForwardingWorkflow(shipment: ForwardingShipment): Promise<any> {
    const steps = [
      { name: 'Booking Confirmation', status: 'pending', responsible: 'operations' },
      { name: 'Carrier Selection', status: 'pending', responsible: 'operations' },
      { name: 'Documentation', status: 'pending', responsible: 'documentation' },
      { name: 'Customs Clearance (Origin)', status: 'pending', responsible: 'customs', skip: !shipment.requiresCustomsClearance },
      { name: 'Pickup Arrangement', status: 'pending', responsible: 'operations' },
      { name: 'Main Carriage', status: 'pending', responsible: 'carrier' },
      { name: 'Customs Clearance (Destination)', status: 'pending', responsible: 'customs', skip: !shipment.requiresCustomsClearance },
      { name: 'Delivery Arrangement', status: 'pending', responsible: 'operations' },
      { name: 'POD Collection', status: 'pending', responsible: 'documentation' },
      { name: 'Invoice & Settlement', status: 'pending', responsible: 'finance' }
    ];

    return {
      shipmentId: shipment.id,
      steps: steps.filter(s => !s.skip),
      currentStep: steps[0].name,
      completionRate: 0
    };
  }

  async calculateCommission(
    freightCost: number,
    mode: string,
    serviceType: string
  ): Promise<{
    freightCost: number;
    commissionRate: number;
    commissionAmount: number;
    totalRevenue: number;
  }> {
    const rate = this.commissionRates.find(
      r => r.mode === mode && r.serviceType === serviceType
    );

    if (!rate) {
      return {
        freightCost,
        commissionRate: 10,
        commissionAmount: freightCost * 0.1,
        totalRevenue: freightCost * 1.1
      };
    }

    let commissionAmount = (freightCost * rate.commissionPercentage) / 100;

    if (commissionAmount < rate.minimumCommission) {
      commissionAmount = rate.minimumCommission;
    }

    if (rate.maximumCommission && commissionAmount > rate.maximumCommission) {
      commissionAmount = rate.maximumCommission;
    }

    return {
      freightCost,
      commissionRate: rate.commissionPercentage,
      commissionAmount,
      totalRevenue: freightCost + commissionAmount
    };
  }

  private async estimateForwardingCost(shipment: ForwardingShipment): Promise<any> {
    const baseCost = this.calculateBaseCost(shipment);
    const commission = await this.calculateCommission(baseCost, shipment.mode, shipment.serviceType);

    const additionalCosts = {
      customsClearance: shipment.requiresCustomsClearance ? 2500 : 0,
      insurance: shipment.requiresInsurance ? shipment.value * 0.02 : 0,
      documentation: 500,
      pickupDelivery: 1500,
      specialHandling: (shipment.specialHandling?.length || 0) * 1000
    };

    const totalAdditional = Object.values(additionalCosts).reduce((sum, cost) => sum + cost, 0);

    return {
      baseFreight: baseCost,
      commission: commission.commissionAmount,
      additionalCharges: additionalCosts,
      totalAdditional,
      totalCost: baseCost + commission.commissionAmount + totalAdditional,
      currency: shipment.currency
    };
  }

  private calculateBaseCost(shipment: ForwardingShipment): number {
    const ratePer100kg: Record<string, number> = {
      sea: 250,
      air: 1500,
      road: 400,
      rail: 200
    };

    return (ratePer100kg[shipment.mode] || 400) * 10;
  }

  private getRequiredDocuments(shipment: ForwardingShipment): string[] {
    const docs = ['Commercial Invoice', 'Packing List'];

    if (shipment.mode === 'sea') {
      docs.push('Bill of Lading', 'Sea Waybill');
    } else if (shipment.mode === 'air') {
      docs.push('Air Waybill (AWB)');
    } else if (shipment.mode === 'road') {
      docs.push('CMR Document');
    }

    if (shipment.requiresCustomsClearance) {
      docs.push('Customs Declaration', 'Certificate of Origin');
    }

    if (shipment.requiresInsurance) {
      docs.push('Insurance Certificate');
    }

    if (shipment.hsCode) {
      docs.push('HS Code Declaration');
    }

    return docs;
  }

  async trackForwardingShipment(shipmentId: string): Promise<any> {
    return {
      shipmentId,
      status: 'in_transit',
      currentLocation: 'Hamburg Port',
      currentLeg: 2,
      totalLegs: 3,
      milestones: [
        { event: 'Booking Confirmed', date: new Date('2024-10-20'), completed: true },
        { event: 'Pickup Completed', date: new Date('2024-10-21'), completed: true },
        { event: 'Departed Origin Port', date: new Date('2024-10-22'), completed: true },
        { event: 'In Transit', date: new Date('2024-10-24'), completed: false },
        { event: 'Arrival at Destination', date: null, completed: false },
        { event: 'Customs Clearance', date: null, completed: false },
        { event: 'Final Delivery', date: null, completed: false }
      ],
      estimatedDelivery: new Date('2024-11-05'),
      documents: {
        uploaded: 7,
        required: 9,
        pending: ['Certificate of Origin', 'Insurance Certificate']
      }
    };
  }

  async getCommissionReport(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalShipments: 145,
      totalFreightCost: 2450000,
      totalCommission: 367500,
      avgCommissionRate: 15,
      breakdown: [
        { mode: 'sea', shipments: 85, freightCost: 1450000, commission: 217500, rate: 15 },
        { mode: 'air', shipments: 35, freightCost: 750000, commission: 90000, rate: 12 },
        { mode: 'road', shipments: 25, freightCost: 250000, commission: 60000, rate: 24 }
      ]
    };
  }
}

