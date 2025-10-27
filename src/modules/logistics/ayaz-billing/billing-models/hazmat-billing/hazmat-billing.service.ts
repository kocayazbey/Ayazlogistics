import { Injectable } from '@nestjs/common';

@Injectable()
export class HazmatBillingService {
  async calculateHazmatHandlingFees(
    unNumber: string,
    hazardClass: string,
    quantity: number,
    packingGroup: 'I' | 'II' | 'III',
    tenantId: string,
  ): Promise<{
    baseHandlingFee: number;
    storageMultiplier: number;
    specialEquipmentFee: number;
    documentationFee: number;
    totalFee: number;
  }> {
    const baseHandlingFee = this.getBaseHandlingFee(hazardClass, packingGroup);
    const storageMultiplier = this.getStorageMultiplier(hazardClass);
    const specialEquipmentFee = this.getSpecialEquipmentFee(hazardClass);
    const documentationFee = 200;

    return {
      baseHandlingFee: baseHandlingFee * quantity,
      storageMultiplier,
      specialEquipmentFee,
      documentationFee,
      totalFee: (baseHandlingFee * quantity) + specialEquipmentFee + documentationFee,
    };
  }

  private getBaseHandlingFee(hazardClass: string, packingGroup: string): number {
    const fees = {
      'I': 50,
      'II': 30,
      'III': 20,
    };
    return fees[packingGroup] || 20;
  }

  private getStorageMultiplier(hazardClass: string): number {
    return 2.5;
  }

  private getSpecialEquipmentFee(hazardClass: string): number {
    return 500;
  }
}

