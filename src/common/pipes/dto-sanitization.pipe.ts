import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class DtoSanitizationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Sanitize the input
    const sanitized = this.sanitizeInput(value);

    // Transform to class instance
    const object = plainToClass(metatype, sanitized);

    // Validate
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException(this.buildError(errors));
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private sanitizeInput(value: any): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeInput(item));
    }

    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeInput(value[key]);
        }
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(str: string): string {
    // Remove HTML tags
    let sanitized = str.replace(/<[^>]*>/g, '');

    // Remove SQL injection attempts
    sanitized = sanitized.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '');

    // Remove script tags and event handlers
    sanitized = sanitized.replace(/(javascript:|on\w+\s*=)/gi, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    // Remove multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ');

    return sanitized;
  }

  private buildError(errors: ValidationError[]): string {
    const messages = errors.map(error => {
      if (error.constraints) {
        return Object.values(error.constraints).join(', ');
      }
      return 'Validation failed';
    });

    return messages.join('; ');
  }
}

// Decorator for deep sanitization
export function Sanitize() {
  return function (target: any, propertyKey: string | symbol, parameterIndex: number) {
    // Store sanitization metadata
    Reflect.defineMetadata('sanitize', true, target, propertyKey);
  };
}

// Specific sanitizers
export class StringSanitizer {
  static email(email: string): string {
    return email.toLowerCase().trim();
  }

  static url(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      throw new BadRequestException('Invalid URL format');
    }
  }

  static phone(phone: string): string {
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  static alphanumeric(str: string): string {
    return str.replace(/[^a-zA-Z0-9]/g, '');
  }

  static filename(filename: string): string {
    // Allow only safe characters in filenames
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }
}

export class NumberSanitizer {
  static positive(num: number): number {
    return Math.abs(num);
  }

  static integer(num: number): number {
    return Math.floor(num);
  }

  static range(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
  }
}

export class ArraySanitizer {
  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  static limit<T>(arr: T[], maxLength: number): T[] {
    return arr.slice(0, maxLength);
  }
}

