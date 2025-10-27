import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BarcodeValidationResult {
  isValid: boolean;
  barcodeType?: string;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface BarcodeFormat {
  type: string;
  pattern: RegExp;
  length: number[];
  checkDigit?: boolean;
  description: string;
}

@Injectable()
export class BarcodeValidatorService {
  private readonly logger = new Logger(BarcodeValidatorService.name);

  // Supported barcode formats
  private readonly supportedFormats: BarcodeFormat[] = [
    {
      type: 'EAN-13',
      pattern: /^\d{12,13}$/,
      length: [13],
      checkDigit: true,
      description: 'European Article Number (13 digits)',
    },
    {
      type: 'EAN-8',
      pattern: /^\d{7,8}$/,
      length: [8],
      checkDigit: true,
      description: 'European Article Number (8 digits)',
    },
    {
      type: 'UPC-A',
      pattern: /^\d{11,12}$/,
      length: [12],
      checkDigit: true,
      description: 'Universal Product Code (12 digits)',
    },
    {
      type: 'UPC-E',
      pattern: /^\d{7,8}$/,
      length: [8],
      checkDigit: true,
      description: 'Universal Product Code (8 digits, compressed)',
    },
    {
      type: 'Code 128',
      pattern: /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~ ]+$/,
      length: [1, 128],
      checkDigit: false,
      description: 'Code 128 (variable length)',
    },
    {
      type: 'Code 39',
      pattern: /^[A-Z0-9\-.$/+% ]+$/,
      length: [1, 43],
      checkDigit: false,
      description: 'Code 39 (variable length, alphanumeric)',
    },
    {
      type: 'Code 93',
      pattern: /^[A-Z0-9\-.$/+% ]+$/,
      length: [1, 50],
      checkDigit: true,
      description: 'Code 93 (variable length, alphanumeric)',
    },
    {
      type: 'QR Code',
      pattern: /^[A-Z0-9\s.,:;!?@#$%^&*()_+\-=\[\]{}|;'",.<>\/?`~]+$/i,
      length: [1, 7089], // Max QR code characters
      checkDigit: false,
      description: 'QR Code (variable length)',
    },
    {
      type: 'Data Matrix',
      pattern: /^[A-Z0-9\s.,:;!?@#$%^&*()_+\-=\[\]{}|;'",.<>\/?`~]+$/i,
      length: [1, 2335], // Max Data Matrix characters
      checkDigit: false,
      description: 'Data Matrix (variable length)',
    },
    {
      type: 'ITF-14',
      pattern: /^\d{13,14}$/,
      length: [14],
      checkDigit: true,
      description: 'Interleaved 2 of 5 (14 digits)',
    },
    {
      type: 'Codabar',
      pattern: /^[A-Da-d0-9\-$:/.+]+$/,
      length: [1, 50],
      checkDigit: false,
      description: 'Codabar (variable length, numeric + symbols)',
    },
  ];

  // Industry-specific barcode prefixes
  private readonly industryPrefixes: Record<string, { range: [number, number]; description: string }> = {
    // GS1 Application Identifiers
    '00': { range: [0, 99], description: 'Serial Shipping Container Code' },
    '01': { range: [0, 99999999999999], description: 'Global Trade Item Number' },
    '10': { range: [0, 999999999999], description: 'Batch/Lot Number' },
    '11': { range: [0, 999999999999], description: 'Production Date' },
    '12': { range: [0, 999999999999], description: 'Due Date' },
    '13': { range: [0, 999999999999], description: 'Packaging Date' },
    '15': { range: [0, 999999999999], description: 'Best Before Date' },
    '16': { range: [0, 999999999999], description: 'Sell By Date' },
    '17': { range: [0, 999999999999], description: 'Expiration Date' },
    '20': { range: [0, 999999999999], description: 'Internal Product Variant' },
    '21': { range: [0, 999999999999], description: 'Serial Number' },
    '22': { range: [0, 999999999999], description: 'Consumer Product Variant' },
    '30': { range: [0, 999999999999], description: 'Variable Count' },
    '37': { range: [0, 999999999999], description: 'Count of Items' },
  };

  constructor(private configService: ConfigService) {}

  /**
   * Validate barcode format and checksum
   */
  validateBarcode(barcode: string): BarcodeValidationResult {
    try {
      if (!barcode || typeof barcode !== 'string') {
        return {
          isValid: false,
          error: 'Barcode is required and must be a string',
          errorCode: 'INVALID_INPUT',
        };
      }

      // Clean barcode (remove spaces, special characters)
      const cleanBarcode = barcode.trim().replace(/[^A-Za-z0-9]/g, '');

      if (cleanBarcode.length === 0) {
        return {
          isValid: false,
          error: 'Barcode cannot be empty after cleaning',
          errorCode: 'EMPTY_BARCODE',
        };
      }

      // Check minimum/maximum length
      if (cleanBarcode.length < 1 || cleanBarcode.length > 100) {
        return {
          isValid: false,
          error: 'Barcode length must be between 1 and 100 characters',
          errorCode: 'INVALID_LENGTH',
        };
      }

      // Find matching format
      const matchingFormats = this.supportedFormats.filter(format =>
        format.pattern.test(cleanBarcode) &&
        format.length.includes(cleanBarcode.length)
      );

      if (matchingFormats.length === 0) {
        return {
          isValid: false,
          error: 'Barcode format not supported',
          errorCode: 'UNSUPPORTED_FORMAT',
          metadata: {
            providedLength: cleanBarcode.length,
            supportedFormats: this.supportedFormats.map(f => f.type),
          },
        };
      }

      // Validate checksum for formats that require it
      for (const format of matchingFormats) {
        if (format.checkDigit) {
          const checksumValid = this.validateChecksum(cleanBarcode, format.type);
          if (checksumValid.isValid) {
            return {
              isValid: true,
              barcodeType: format.type,
              metadata: {
                format: format.description,
                length: cleanBarcode.length,
                industryInfo: this.getIndustryInfo(cleanBarcode),
              },
            };
          }
        } else {
          // Format matches and no checksum required
          return {
            isValid: true,
            barcodeType: format.type,
            metadata: {
              format: format.description,
              length: cleanBarcode.length,
              industryInfo: this.getIndustryInfo(cleanBarcode),
            },
          };
        }
      }

      // If we get here, format matched but checksum failed
      return {
        isValid: false,
        error: 'Invalid barcode checksum',
        errorCode: 'INVALID_CHECKSUM',
        metadata: {
          detectedFormats: matchingFormats.map(f => f.type),
        },
      };
    } catch (error) {
      this.logger.error('Barcode validation error:', error);
      return {
        isValid: false,
        error: 'Internal validation error',
        errorCode: 'VALIDATION_ERROR',
      };
    }
  }

  /**
   * Validate barcode checksum
   */
  private validateChecksum(barcode: string, format: string): BarcodeValidationResult {
    try {
      switch (format) {
        case 'EAN-13':
          return this.validateEAN13Checksum(barcode);
        case 'EAN-8':
          return this.validateEAN8Checksum(barcode);
        case 'UPC-A':
          return this.validateUPCAChecksum(barcode);
        case 'UPC-E':
          return this.validateUPCEChecksum(barcode);
        case 'ITF-14':
          return this.validateITF14Checksum(barcode);
        case 'Code 93':
          return this.validateCode93Checksum(barcode);
        default:
          return { isValid: false, error: `Checksum validation not implemented for ${format}` };
      }
    } catch (error) {
      return { isValid: false, error: 'Checksum validation failed' };
    }
  }

  /**
   * Validate EAN-13 checksum
   */
  private validateEAN13Checksum(barcode: string): BarcodeValidationResult {
    if (barcode.length !== 13) {
      return { isValid: false, error: 'EAN-13 must be 13 digits' };
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(barcode[i]);
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(barcode[12]);

    return {
      isValid: checkDigit === providedCheckDigit,
      error: checkDigit !== providedCheckDigit ? 'Invalid EAN-13 check digit' : undefined,
    };
  }

  /**
   * Validate EAN-8 checksum
   */
  private validateEAN8Checksum(barcode: string): BarcodeValidationResult {
    if (barcode.length !== 8) {
      return { isValid: false, error: 'EAN-8 must be 8 digits' };
    }

    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(barcode[i]);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(barcode[7]);

    return {
      isValid: checkDigit === providedCheckDigit,
      error: checkDigit !== providedCheckDigit ? 'Invalid EAN-8 check digit' : undefined,
    };
  }

  /**
   * Validate UPC-A checksum
   */
  private validateUPCAChecksum(barcode: string): BarcodeValidationResult {
    if (barcode.length !== 12) {
      return { isValid: false, error: 'UPC-A must be 12 digits' };
    }

    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(barcode[i]);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(barcode[11]);

    return {
      isValid: checkDigit === providedCheckDigit,
      error: checkDigit !== providedCheckDigit ? 'Invalid UPC-A check digit' : undefined,
    };
  }

  /**
   * Validate UPC-E checksum
   */
  private validateUPCEChecksum(barcode: string): BarcodeValidationResult {
    if (barcode.length !== 8) {
      return { isValid: false, error: 'UPC-E must be 8 digits' };
    }

    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(barcode[i]);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(barcode[7]);

    return {
      isValid: checkDigit === providedCheckDigit,
      error: checkDigit !== providedCheckDigit ? 'Invalid UPC-E check digit' : undefined,
    };
  }

  /**
   * Validate ITF-14 checksum
   */
  private validateITF14Checksum(barcode: string): BarcodeValidationResult {
    if (barcode.length !== 14) {
      return { isValid: false, error: 'ITF-14 must be 14 digits' };
    }

    let sum = 0;
    for (let i = 0; i < 13; i++) {
      const digit = parseInt(barcode[i]);
      sum += digit * (i % 2 === 0 ? 3 : 1);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(barcode[13]);

    return {
      isValid: checkDigit === providedCheckDigit,
      error: checkDigit !== providedCheckDigit ? 'Invalid ITF-14 check digit' : undefined,
    };
  }

  /**
   * Validate Code 93 checksum
   */
  private validateCode93Checksum(barcode: string): BarcodeValidationResult {
    // Code 93 uses two check digits (C and K)
    if (barcode.length < 3) {
      return { isValid: false, error: 'Code 93 must have at least 3 characters' };
    }

    // This is a simplified validation - full Code 93 validation is complex
    // In production, you might want to use a dedicated library
    const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
    const hasValidChars = barcode.split('').every(char => validChars.includes(char));

    return {
      isValid: hasValidChars,
      error: hasValidChars ? undefined : 'Invalid characters in Code 93 barcode',
    };
  }

  /**
   * Get industry information from GS1 Application Identifier
   */
  private getIndustryInfo(barcode: string): any {
    if (barcode.length < 2) return null;

    const prefix = barcode.substring(0, 2);
    const industryInfo = this.industryPrefixes[prefix];

    if (industryInfo) {
      return {
        applicationIdentifier: prefix,
        description: industryInfo.description,
        range: industryInfo.range,
      };
    }

    return null;
  }

  /**
   * Generate barcode suggestions for invalid inputs
   */
  generateSuggestions(invalidBarcode: string): string[] {
    const suggestions: string[] = [];
    const cleanBarcode = invalidBarcode.trim().replace(/[^A-Za-z0-9]/g, '');

    if (cleanBarcode.length === 0) return suggestions;

    // Suggest adding leading zeros for EAN/UPC
    if (cleanBarcode.length === 12) {
      suggestions.push(`0${cleanBarcode}`); // EAN-13
    } else if (cleanBarcode.length === 11) {
      suggestions.push(`0${cleanBarcode}`); // UPC-A
    } else if (cleanBarcode.length === 7) {
      suggestions.push(`0${cleanBarcode}`); // EAN-8/UPC-E
    }

    // Suggest removing characters if too long
    if (cleanBarcode.length > 13) {
      suggestions.push(cleanBarcode.substring(0, 13));
    }

    // Suggest common format corrections
    if (/^\d+$/.test(cleanBarcode)) {
      const possibleFormats = this.supportedFormats.filter(format =>
        format.length.includes(cleanBarcode.length) || format.length.includes(cleanBarcode.length + 1)
      );

      possibleFormats.forEach(format => {
        suggestions.push(`${format.type} format detected`);
      });
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Batch validate multiple barcodes
   */
  validateBarcodes(barcodes: string[]): Array<BarcodeValidationResult & { barcode: string }> {
    return barcodes.map(barcode => ({
      barcode,
      ...this.validateBarcode(barcode),
    }));
  }

  /**
   * Get supported barcode formats
   */
  getSupportedFormats(): Array<{ type: string; description: string; length: number[] }> {
    return this.supportedFormats.map(format => ({
      type: format.type,
      description: format.description,
      length: format.length,
    }));
  }

  /**
   * Detect barcode type without validation
   */
  detectBarcodeType(barcode: string): string | null {
    const cleanBarcode = barcode.trim().replace(/[^A-Za-z0-9]/g, '');

    const matchingFormat = this.supportedFormats.find(format =>
      format.pattern.test(cleanBarcode) &&
      format.length.includes(cleanBarcode.length)
    );

    return matchingFormat?.type || null;
  }

  /**
   * Validate barcode for specific use case
   */
  validateForUseCase(barcode: string, useCase: 'product' | 'shipment' | 'inventory' | 'customer'): BarcodeValidationResult {
    const baseValidation = this.validateBarcode(barcode);

    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Use case specific validations
    switch (useCase) {
      case 'product':
        // Products should have valid GS1 Application Identifiers
        const industryInfo = this.getIndustryInfo(barcode);
        if (!industryInfo) {
          return {
            isValid: false,
            error: 'Product barcode should include valid GS1 Application Identifier',
            errorCode: 'INVALID_PRODUCT_BARCODE',
          };
        }
        break;

      case 'shipment':
        // Shipments should use ITF-14 or Code 128
        if (!['ITF-14', 'Code 128'].includes(baseValidation.barcodeType!)) {
          return {
            isValid: false,
            error: 'Shipment barcode should be ITF-14 or Code 128 format',
            errorCode: 'INVALID_SHIPMENT_BARCODE',
          };
        }
        break;

      case 'inventory':
        // Inventory can use any supported format
        break;

      case 'customer':
        // Customer barcodes should be short and alphanumeric
        if (barcode.length > 20) {
          return {
            isValid: false,
            error: 'Customer barcode should be 20 characters or less',
            errorCode: 'INVALID_CUSTOMER_BARCODE',
          };
        }
        break;
    }

    return baseValidation;
  }

  /**
   * Generate barcode validation report
   */
  generateValidationReport(barcodes: string[]): {
    total: number;
    valid: number;
    invalid: number;
    byType: Record<string, number>;
    errors: Array<{ barcode: string; error: string; errorCode: string }>;
  } {
    const results = this.validateBarcodes(barcodes);
    const validResults = results.filter(r => r.isValid);
    const invalidResults = results.filter(r => !r.isValid);

    const byType: Record<string, number> = {};
    validResults.forEach(result => {
      if (result.barcodeType) {
        byType[result.barcodeType] = (byType[result.barcodeType] || 0) + 1;
      }
    });

    return {
      total: barcodes.length,
      valid: validResults.length,
      invalid: invalidResults.length,
      byType,
      errors: invalidResults.map(r => ({
        barcode: r.barcode,
        error: r.error || 'Unknown error',
        errorCode: r.errorCode || 'UNKNOWN_ERROR',
      })),
    };
  }
}
