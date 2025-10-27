import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * WMS Request Validation Middleware
 * Validates common WMS request patterns
 */
@Injectable()
export class WmsValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger('WMS-Validation');

  use(req: Request, res: Response, next: NextFunction) {
    // Validate warehouseId format if present
    if (req.body?.warehouseId || req.query?.warehouseId) {
      const warehouseId = req.body?.warehouseId || req.query?.warehouseId;
      
      if (!this.isValidUUID(warehouseId as string)) {
        this.logger.warn(`Invalid warehouseId format: ${warehouseId}`);
        throw new BadRequestException('Invalid warehouseId format');
      }
    }

    // Validate quantity fields
    if (req.body?.quantity !== undefined) {
      const quantity = Number(req.body.quantity);
      
      if (isNaN(quantity) || quantity < 0) {
        throw new BadRequestException('Quantity must be a positive number');
      }
      
      if (quantity > 999999) {
        throw new BadRequestException('Quantity exceeds maximum allowed value');
      }
    }

    // Validate date formats
    if (req.body?.expectedDate) {
      const date = new Date(req.body.expectedDate);
      
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format for expectedDate');
      }
    }

    // Validate arrays
    if (req.body?.lineItems !== undefined) {
      if (!Array.isArray(req.body.lineItems)) {
        throw new BadRequestException('lineItems must be an array');
      }
      
      if (req.body.lineItems.length === 0) {
        throw new BadRequestException('lineItems cannot be empty');
      }
      
      if (req.body.lineItems.length > 1000) {
        throw new BadRequestException('lineItems exceeds maximum of 1000 items');
      }
    }

    next();
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

