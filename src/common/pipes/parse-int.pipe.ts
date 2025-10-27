import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    
    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed. "${value}" is not a valid integer.`,
      );
    }
    
    return val;
  }
}

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    
    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed. "${value}" is not a valid integer.`,
      );
    }
    
    if (val <= 0) {
      throw new BadRequestException(
        `Validation failed. "${value}" must be a positive integer.`,
      );
    }
    
    return val;
  }
}

@Injectable()
export class ParseOptionalIntPipe implements PipeTransform<string | undefined, number | undefined> {
  transform(value: string | undefined, metadata: ArgumentMetadata): number | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    
    const val = parseInt(value, 10);
    
    if (isNaN(val)) {
      throw new BadRequestException(
        `Validation failed. "${value}" is not a valid integer.`,
      );
    }
    
    return val;
  }
}

