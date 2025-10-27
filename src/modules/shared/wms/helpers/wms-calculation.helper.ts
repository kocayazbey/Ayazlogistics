/**
 * WMS Calculation Helper
 * Common calculation utilities for WMS operations
 */

export class WmsCalculationHelper {
  /**
   * Calculate cubic volume in cubic meters
   */
  static calculateVolume(length: number, width: number, height: number, unit: 'cm' | 'm' = 'cm'): number {
    if (unit === 'cm') {
      return (length * width * height) / 1000000; // Convert cm³ to m³
    }
    return length * width * height;
  }

  /**
   * Calculate dimensional weight (volumetric weight)
   * @param length Length in cm
   * @param width Width in cm
   * @param height Height in cm
   * @param divisor Carrier divisor (default 5000 for international, 3000 for domestic)
   */
  static calculateDimensionalWeight(
    length: number,
    width: number,
    height: number,
    divisor: number = 5000
  ): number {
    return (length * width * height) / divisor;
  }

  /**
   * Calculate chargeable weight (max of actual weight or dimensional weight)
   */
  static calculateChargeableWeight(
    actualWeight: number,
    length: number,
    width: number,
    height: number,
    divisor: number = 5000
  ): number {
    const dimWeight = this.calculateDimensionalWeight(length, width, height, divisor);
    return Math.max(actualWeight, dimWeight);
  }

  /**
   * Calculate pallet utilization percentage
   */
  static calculatePalletUtilization(
    usedWeight: number,
    maxWeight: number,
    usedVolume: number,
    maxVolume: number
  ): number {
    const weightUtil = (usedWeight / maxWeight) * 100;
    const volumeUtil = (usedVolume / maxVolume) * 100;
    return Math.min(weightUtil, volumeUtil);
  }

  /**
   * Calculate warehouse space utilization
   */
  static calculateSpaceUtilization(
    usedArea: number,
    totalArea: number,
    usedHeight: number = 1,
    maxHeight: number = 1
  ): number {
    const areaUtil = (usedArea / totalArea) * 100;
    const heightUtil = (usedHeight / maxHeight) * 100;
    return (areaUtil + heightUtil) / 2;
  }

  /**
   * Calculate picking efficiency (lines per hour)
   */
  static calculatePickingEfficiency(totalLines: number, totalHours: number): number {
    return totalHours > 0 ? totalLines / totalHours : 0;
  }

  /**
   * Calculate inventory turnover ratio
   */
  static calculateInventoryTurnover(
    costOfGoodsSold: number,
    averageInventoryValue: number
  ): number {
    return averageInventoryValue > 0 ? costOfGoodsSold / averageInventoryValue : 0;
  }

  /**
   * Calculate days of inventory on hand
   */
  static calculateDaysOfInventory(inventoryTurnover: number): number {
    return inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;
  }

  /**
   * Calculate safety stock
   * Using formula: Safety Stock = (Max daily usage × Max lead time) - (Avg daily usage × Avg lead time)
   */
  static calculateSafetyStock(
    maxDailyUsage: number,
    maxLeadTimeDays: number,
    avgDailyUsage: number,
    avgLeadTimeDays: number
  ): number {
    return (maxDailyUsage * maxLeadTimeDays) - (avgDailyUsage * avgLeadTimeDays);
  }

  /**
   * Calculate reorder point
   * Formula: Reorder Point = (Average daily usage × Lead time) + Safety stock
   */
  static calculateReorderPoint(
    avgDailyUsage: number,
    leadTimeDays: number,
    safetyStock: number
  ): number {
    return (avgDailyUsage * leadTimeDays) + safetyStock;
  }

  /**
   * Calculate Economic Order Quantity (EOQ)
   * Formula: EOQ = sqrt((2 × Annual Demand × Ordering Cost) / Holding Cost per Unit)
   */
  static calculateEOQ(
    annualDemand: number,
    orderingCost: number,
    holdingCostPerUnit: number
  ): number {
    if (holdingCostPerUnit <= 0) return 0;
    return Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  }

  /**
   * Calculate order fill rate
   */
  static calculateFillRate(ordersFilledCompletely: number, totalOrders: number): number {
    return totalOrders > 0 ? (ordersFilledCompletely / totalOrders) * 100 : 0;
  }

  /**
   * Calculate perfect order rate
   * Perfect order = On time + Complete + Damage free + Correct documentation
   */
  static calculatePerfectOrderRate(perfectOrders: number, totalOrders: number): number {
    return totalOrders > 0 ? (perfectOrders / totalOrders) * 100 : 0;
  }

  /**
   * Calculate storage cost per unit
   */
  static calculateStorageCostPerUnit(
    totalStorageCost: number,
    totalUnitsStored: number,
    periodDays: number
  ): number {
    return totalUnitsStored > 0 ? totalStorageCost / totalUnitsStored / periodDays : 0;
  }

  /**
   * Calculate distance between two locations (Euclidean)
   */
  static calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Calculate travel time based on distance and speed
   */
  static calculateTravelTime(
    distanceMeters: number,
    speedMetersPerSecond: number = 1.5
  ): number {
    return distanceMeters / speedMetersPerSecond;
  }

  /**
   * Determine ABC classification based on value
   */
  static classifyABC(cumulativePercentage: number): 'A' | 'B' | 'C' {
    if (cumulativePercentage <= 80) return 'A';
    if (cumulativePercentage <= 95) return 'B';
    return 'C';
  }

  /**
   * Calculate variance percentage
   */
  static calculateVariancePercentage(actual: number, expected: number): number {
    if (expected === 0) return actual > 0 ? 100 : 0;
    return ((actual - expected) / expected) * 100;
  }

  /**
   * Calculate accuracy rate
   */
  static calculateAccuracyRate(correct: number, total: number): number {
    return total > 0 ? (correct / total) * 100 : 0;
  }

  /**
   * Round to specified decimal places
   */
  static roundTo(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Convert weight units
   */
  static convertWeight(value: number, from: 'kg' | 'lb' | 'g', to: 'kg' | 'lb' | 'g'): number {
    const toKg: Record<string, number> = {
      kg: 1,
      lb: 0.453592,
      g: 0.001,
    };

    const fromKg: Record<string, number> = {
      kg: 1,
      lb: 2.20462,
      g: 1000,
    };

    const kg = value * toKg[from];
    return kg * fromKg[to];
  }

  /**
   * Convert length units
   */
  static convertLength(value: number, from: 'cm' | 'm' | 'in' | 'ft', to: 'cm' | 'm' | 'in' | 'ft'): number {
    const toM: Record<string, number> = {
      cm: 0.01,
      m: 1,
      in: 0.0254,
      ft: 0.3048,
    };

    const fromM: Record<string, number> = {
      cm: 100,
      m: 1,
      in: 39.3701,
      ft: 3.28084,
    };

    const meters = value * toM[from];
    return meters * fromM[to];
  }
}

