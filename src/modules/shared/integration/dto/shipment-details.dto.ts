import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ShipmentAddressDetailsDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ABC Company' })
  @IsString()
  company: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty()
  address1: string;

  @ApiProperty({ example: 'Suite 100' })
  @IsString()
  address2: string;

  @ApiProperty({ example: 'Istanbul' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Marmara' })
  @IsString()
  state: string;

  @ApiProperty({ example: '34000' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiProperty({ example: 'TR' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: '+905551234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class ShipmentPackageDetailsDto {
  @ApiProperty({ example: 15.5, description: 'Weight in kg' })
  @IsNumber()
  @Min(0)
  weight: number;

  @ApiProperty({ example: 50, description: 'Length in cm' })
  @IsNumber()
  @Min(0)
  length: number;

  @ApiProperty({ example: 40, description: 'Width in cm' })
  @IsNumber()
  @Min(0)
  width: number;

  @ApiProperty({ example: 30, description: 'Height in cm' })
  @IsNumber()
  @Min(0)
  height: number;
}

export class ShipmentDetailsDto {
  @ApiProperty({ type: ShipmentAddressDetailsDto })
  @ValidateNested()
  @Type(() => ShipmentAddressDetailsDto)
  @IsNotEmpty()
  origin: ShipmentAddressDetailsDto;

  @ApiProperty({ type: ShipmentAddressDetailsDto })
  @ValidateNested()
  @Type(() => ShipmentAddressDetailsDto)
  @IsNotEmpty()
  destination: ShipmentAddressDetailsDto;

  @ApiProperty({ type: [ShipmentPackageDetailsDto] })
  @ValidateNested({ each: true })
  @Type(() => ShipmentPackageDetailsDto)
  @IsNotEmpty()
  packages: ShipmentPackageDetailsDto[];

  @ApiProperty({ example: 'ground' })
  @IsString()
  @IsNotEmpty()
  serviceCode: string;
}

