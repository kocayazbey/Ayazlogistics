import { Injectable } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class ValidationService {
  async validateDto<T>(dtoClass: new () => T, data: any): Promise<ValidationResult> {
    const dto = plainToClass(dtoClass, data);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const errorMessages = this.extractValidationErrors(errors);
      return { isValid: false, errors: errorMessages };
    }

    return { isValid: true, errors: [] };
  }

  private extractValidationErrors(errors: ValidationError[]): string[] {
    return errors.flatMap(error => {
      if (error.children && error.children.length > 0) {
        return this.extractValidationErrors(error.children);
      }

      const constraints = error.constraints;
      if (constraints) {
        return Object.values(constraints);
      }

      return [];
    });
  }

  isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
  }

  validateWarehouseOperation(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data.type) {
      errors.push('Operation type is required');
    }

    if (!data.warehouseId) {
      errors.push('Warehouse ID is required');
    }

    if (data.assignedTo && !this.isValidUUID(data.assignedTo)) {
      errors.push('Invalid assigned user ID format');
    }

    if (!['pending', 'in_progress', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Invalid operation status');
    }

    if (!['low', 'medium', 'high'].includes(data.priority)) {
      errors.push('Invalid operation priority');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateWarehouseOperationUpdate(data: any): ValidationResult {
    const errors: string[] = [];

    if (data.status && !['pending', 'in_progress', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Invalid operation status');
    }

    if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
      errors.push('Invalid operation priority');
    }

    if (data.assignedTo && !this.isValidUUID(data.assignedTo)) {
      errors.push('Invalid assigned user ID format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
