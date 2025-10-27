import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface LastMilePartner {
  id: string;
  name: string;
  code: string;
  apiUrl: string;
  coverage: string[];
  capabilities: string[];
}

interface LastMileDeliveryRequest {
  partnerId: string;
  shipmentId: string;
  customerName: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryDistrict: string;
  customerPhone: string;
  deliveryWindow?: { start: string; end: string };
  specialInstructions?: string;
}

@Injectable()
export class LastMilePartnersService {
  private partners: LastMilePartner[] = [
    {
      id: 'LMP-001',
      name: 'Getir',
      code: 'GETIR',
      apiUrl: 'https://api.getir.com/v1',
      coverage: ['Istanbul', 'Ankara', 'Izmir'],
      capabilities: ['same_day', 'scheduled', 'express'],
    },
    {
      id: 'LMP-002',
      name: 'Trendyol Express',
      code: 'TYEXPRESS',
      apiUrl: 'https://api.trendyolexpress.com/v1',
      coverage: ['All Turkey'],
      capabilities: ['same_day', 'next_day'],
    },
  ];

  async requestDelivery(data: LastMileDeliveryRequest, tenantId: string): Promise<any> {
    const partner = this.partners.find(p => p.id === data.partnerId);

    if (!partner) {
      throw new Error(`Last mile partner not found: ${data.partnerId}`);
    }

    try {
      const response = await axios.post(
        `${partner.apiUrl}/deliveries`,
        {
          shipment_id: data.shipmentId,
          customer: {
            name: data.customerName,
            phone: data.customerPhone,
          },
          address: {
            full_address: data.deliveryAddress,
            city: data.deliveryCity,
            district: data.deliveryDistrict,
          },
          delivery_window: data.deliveryWindow,
          instructions: data.specialInstructions,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env[`${partner.code}_API_KEY`]}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Last mile delivery request failed: ${error.message}`);
    }
  }

  async getPartnersByCity(city: string, tenantId: string): Promise<LastMilePartner[]> {
    return this.partners.filter(p => 
      p.coverage.includes(city) || p.coverage.includes('All Turkey')
    );
  }

  async trackDelivery(partnerId: string, deliveryId: string, tenantId: string): Promise<any> {
    const partner = this.partners.find(p => p.id === partnerId);
    
    if (!partner) {
      throw new Error(`Partner not found: ${partnerId}`);
    }

    try {
      const response = await axios.get(
        `${partner.apiUrl}/deliveries/${deliveryId}/tracking`,
        {
          headers: {
            'Authorization': `Bearer ${process.env[`${partner.code}_API_KEY`]}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`Last mile tracking failed: ${error.message}`);
    }
  }
}

