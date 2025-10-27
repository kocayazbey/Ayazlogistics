/**
 * WMS Validation Helper
 * Common validation utilities for WMS operations
 */

export class WmsValidationHelper {
  /**
   * Validate barcode format
   */
  static isValidBarcode(barcode: string, type?: 'EAN13' | 'UPC' | 'CODE128' | 'QR'): boolean {
    if (!barcode || barcode.length === 0) return false;

    switch (type) {
      case 'EAN13':
        return /^\d{13}$/.test(barcode) && this.validateEAN13Checksum(barcode);
      case 'UPC':
        return /^\d{12}$/.test(barcode);
      case 'CODE128':
        return barcode.length >= 1 && barcode.length <= 128;
      case 'QR':
        return barcode.length >= 1 && barcode.length <= 4296;
      default:
        return barcode.length >= 1 && barcode.length <= 128;
    }
  }

  /**
   * Validate EAN13 checksum
   */
  private static validateEAN13Checksum(barcode: string): boolean {
    if (barcode.length !== 13) return false;

    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop()!;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    const calculatedCheck = (10 - (sum % 10)) % 10;
    return calculatedCheck === checkDigit;
  }

  /**
   * Validate SKU format
   */
  static isValidSKU(sku: string): boolean {
    // SKU should be alphanumeric with optional hyphens/underscores
    return /^[A-Za-z0-9_-]{1,50}$/.test(sku);
  }

  /**
   * Validate location code format
   */
  static isValidLocationCode(code: string): boolean {
    // Format: ZONE-AISLE-RACK-SHELF-BIN (e.g., A-01-02-03-04)
    return /^[A-Z]\d?-\d{1,3}-\d{1,3}-\d{1,3}(-\d{1,3})?$/.test(code);
  }

  /**
   * Validate lot number format
   */
  static isValidLotNumber(lotNumber: string): boolean {
    return /^[A-Za-z0-9_-]{1,100}$/.test(lotNumber);
  }

  /**
   * Validate serial number format
   */
  static isValidSerialNumber(serialNumber: string): boolean {
    return /^[A-Za-z0-9_-]{1,100}$/.test(serialNumber);
  }

  /**
   * Validate quantity (must be positive)
   */
  static isValidQuantity(quantity: number): boolean {
    return Number.isFinite(quantity) && quantity > 0 && quantity <= 999999;
  }

  /**
   * Validate weight (must be positive)
   */
  static isValidWeight(weight: number, maxWeight: number = 100000): boolean {
    return Number.isFinite(weight) && weight > 0 && weight <= maxWeight;
  }

  /**
   * Validate dimensions
   */
  static isValidDimensions(
    length: number,
    width: number,
    height: number,
    maxDimension: number = 1000
  ): boolean {
    return (
      Number.isFinite(length) && length > 0 && length <= maxDimension &&
      Number.isFinite(width) && width > 0 && width <= maxDimension &&
      Number.isFinite(height) && height > 0 && height <= maxDimension
    );
  }

  /**
   * Validate date is not in past
   */
  static isFutureDate(date: Date): boolean {
    return date.getTime() > Date.now();
  }

  /**
   * Validate date range
   */
  static isValidDateRange(startDate: Date, endDate: Date, maxRangeDays: number = 365): boolean {
    if (startDate >= endDate) return false;
    
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= maxRangeDays;
  }

  /**
   * Validate postal code format (Turkish)
   */
  static isValidPostalCode(postalCode: string, country: string = 'TR'): boolean {
    const patterns: Record<string, RegExp> = {
      TR: /^\d{5}$/,
      US: /^\d{5}(-\d{4})?$/,
      UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
    };

    const pattern = patterns[country] || /^[A-Za-z0-9\s-]{3,10}$/;
    return pattern.test(postalCode);
  }

  /**
   * Validate phone number (basic)
   */
  static isValidPhoneNumber(phone: string): boolean {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Should be between 10-15 digits
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Sanitize input string
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential XSS
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate percentage (0-100)
   */
  static isValidPercentage(value: number): boolean {
    return Number.isFinite(value) && value >= 0 && value <= 100;
  }

  /**
   * Validate currency code
   */
  static isValidCurrencyCode(code: string): boolean {
    const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP'];
    return validCurrencies.includes(code.toUpperCase());
  }

  /**
   * Check if inventory is sufficient
   */
  static checkInventorySufficiency(
    available: number,
    required: number,
    allowBackorder: boolean = false
  ): { sufficient: boolean; shortage: number } {
    const shortage = Math.max(0, required - available);
    
    return {
      sufficient: allowBackorder ? true : available >= required,
      shortage,
    };
  }

  /**
   * Calculate picking path distance (Manhattan distance for warehouse grid)
   */
  static calculateManhattanDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }
}

