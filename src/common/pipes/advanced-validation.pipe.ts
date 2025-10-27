import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';

@Injectable()
export class AdvancedValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform the object
    const object = plainToInstance(metatype, value, {
      enableImplicitConversion: true,
      excludeExtraneousValues: true,
    });

    // Validate with advanced options
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: false,
      validationError: {
        target: false,
        value: false,
      },
      transform: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: this.formatValidationErrors(errors),
        timestamp: new Date().toISOString(),
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => {
      const formattedError: any = {
        field: error.property,
        value: error.value,
        constraints: error.constraints,
      };

      if (error.children && error.children.length > 0) {
        formattedError.children = this.formatValidationErrors(error.children);
      }

      return formattedError;
    });
  }
}

// Custom validation decorators
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsValidEmail(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidEmail',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid email address`;
        }
      }
    });
  };
}

export function IsValidPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          // International phone number format
          const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
          return phoneRegex.test(value.replace(/\s/g, ''));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number`;
        }
      }
    });
  };
}

export function IsValidCoordinate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCoordinate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          const coordRegex = /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/;
          const num = parseFloat(value);
          return coordRegex.test(value) && num >= -90 && num <= 90;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid coordinate between -90 and 90`;
        }
      }
    });
  };
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
          const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          return strongPasswordRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain at least 8 characters, including uppercase, lowercase, number and special character`;
        }
      }
    });
  };
}

export function IsValidUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidUUID',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID`;
        }
      }
    });
  };
}

export function IsValidIP(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidIP',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          return ipRegex.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid IP address`;
        }
      }
    });
  };
}

export function IsValidUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          try {
            new URL(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid URL`;
        }
      }
    });
  };
}

export function IsValidJsonString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidJsonString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          try {
            JSON.parse(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid JSON string`;
        }
      }
    });
  };
}

// Custom transformers
export function Trim() {
  return Transform(({ value }) => {
    return typeof value === 'string' ? value.trim() : value;
  });
}

export function ToLowerCase() {
  return Transform(({ value }) => {
    return typeof value === 'string' ? value.toLowerCase() : value;
  });
}

export function ToUpperCase() {
  return Transform(({ value }) => {
    return typeof value === 'string' ? value.toUpperCase() : value;
  });
}

export function ToNumber() {
  return Transform(({ value }) => {
    return typeof value === 'string' ? parseFloat(value) : value;
  });
}

export function ToBoolean() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  });
}
