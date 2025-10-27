import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Address {
  id: string;
  customerId: string;
  addressType: 'pickup' | 'delivery' | 'billing' | 'both';
  label: string; // e.g., "Main Warehouse", "Istanbul Office"
  isDefault: boolean;
  contactName: string;
  companyName?: string;
  phone: string;
  email?: string;
  address: string;
  address2?: string;
  city: string;
  district: string;
  postalCode?: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  businessHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  specialInstructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

@Injectable()
export class AddressBookService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createAddress(
    data: Omit<Address, 'id' | 'createdAt'>,
    tenantId: string,
    userId: string,
  ): Promise<Address> {
    const addressId = `ADDR-${Date.now()}`;

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await this.unsetDefaultAddresses(data.customerId, data.addressType, tenantId);
    }

    const address: Address = {
      id: addressId,
      ...data,
      createdAt: new Date(),
    };

    await this.eventBus.emit('address.created', {
      addressId,
      customerId: data.customerId,
      addressType: data.addressType,
      label: data.label,
      tenantId,
    });

    return address;
  }

  async getAddress(addressId: string, customerId: string, tenantId: string): Promise<Address | null> {
    // Mock: Would query address_book table
    return null;
  }

  async getCustomerAddresses(
    customerId: string,
    addressType?: Address['addressType'],
    tenantId?: string,
  ): Promise<Address[]> {
    // Mock: Would query address_book table
    return [];
  }

  async updateAddress(
    addressId: string,
    updates: Partial<Address>,
    tenantId: string,
    userId: string,
  ): Promise<Address> {
    // If setting as default, unset other defaults
    if (updates.isDefault) {
      const address = await this.getAddress(addressId, updates.customerId || '', tenantId);
      if (address) {
        await this.unsetDefaultAddresses(address.customerId, address.addressType, tenantId);
      }
    }

    await this.eventBus.emit('address.updated', {
      addressId,
      updatedBy: userId,
      tenantId,
    });

    // Mock: Would return updated address
    return null as any;
  }

  async deleteAddress(addressId: string, customerId: string, tenantId: string, userId: string): Promise<void> {
    await this.eventBus.emit('address.deleted', {
      addressId,
      customerId,
      deletedBy: userId,
      tenantId,
    });
  }

  async setDefaultAddress(
    addressId: string,
    customerId: string,
    addressType: Address['addressType'],
    tenantId: string,
  ): Promise<void> {
    await this.unsetDefaultAddresses(customerId, addressType, tenantId);

    await this.eventBus.emit('address.set_default', {
      addressId,
      customerId,
      addressType,
      tenantId,
    });
  }

  async getDefaultAddress(
    customerId: string,
    addressType: Address['addressType'],
    tenantId: string,
  ): Promise<Address | null> {
    // Mock: Would query for default address
    return null;
  }

  async validateAddress(address: Partial<Address>): Promise<{
    valid: boolean;
    suggestions?: Address[];
    errors?: string[];
  }> {
    const errors: string[] = [];

    if (!address.address || address.address.trim().length < 10) {
      errors.push('Address must be at least 10 characters');
    }

    if (!address.city) {
      errors.push('City is required');
    }

    if (!address.district) {
      errors.push('District is required');
    }

    if (!address.phone || !/^[0-9]{10,}$/.test(address.phone.replace(/[^0-9]/g, ''))) {
      errors.push('Valid phone number is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async geocodeAddress(addressId: string, tenantId: string): Promise<{
    latitude: number;
    longitude: number;
  } | null> {
    // Mock: Would call Google Maps Geocoding API
    return {
      latitude: 41.0082,
      longitude: 28.9784,
    };
  }

  private async unsetDefaultAddresses(
    customerId: string,
    addressType: Address['addressType'],
    tenantId: string,
  ): Promise<void> {
    // Mock: Would update all default addresses for this customer/type to false
  }
}

