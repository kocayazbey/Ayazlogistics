import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class SetWorkflowParameterDto {
  @ApiProperty({ example: 'AUTO_PUTAWAY_SUGGEST' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsNotEmpty()
  value: any;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}

export class EvaluateRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ruleCode: string;

  @ApiProperty()
  @IsNotEmpty()
  context: any;
}

