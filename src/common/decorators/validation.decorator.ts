import { SetMetadata } from '@nestjs/common';

export const VALIDATION_KEY = 'validation';
export const VALIDATION_OPTIONS_KEY = 'validation_options';

export interface ValidationOptions {
  strict?: boolean;
  sanitize?: boolean;
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  skipMissingProperties?: boolean;
  enableImplicitConversion?: boolean;
  customValidators?: string[];
  customTransformers?: string[];
  errorMessages?: Record<string, string>;
}

export const Validation = (options: ValidationOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(VALIDATION_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(VALIDATION_OPTIONS_KEY, {
      strict: true,
      sanitize: true,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

export const ValidationStrict = () => Validation({ strict: true, sanitize: true });
export const ValidationLoose = () => Validation({ strict: false, skipMissingProperties: true });
export const ValidationSanitize = () => Validation({ sanitize: true, transform: true });
