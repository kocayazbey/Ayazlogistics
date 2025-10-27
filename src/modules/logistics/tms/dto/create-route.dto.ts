import { IsString, IsUUID, IsDateString, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum RouteStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export class CreateRouteDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  routeNumber: string;

  @IsUUID()
  vehicleId: string;

  @IsUUID()
  driverId: string;

  @IsDateString()
  routeDate: string;

  @IsOptional()
  @IsString()
  totalDistance?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsNumber()
  totalStops?: number;

  @IsOptional()
  @IsString()
  optimizationAlgorithm?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  createdBy?: string;
}

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  routeNumber?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsDateString()
  routeDate?: string;

  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @IsOptional()
  @IsString()
  totalDistance?: string;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsNumber()
  totalStops?: number;

  @IsOptional()
  @IsString()
  optimizationAlgorithm?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RouteQueryDto {
  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}