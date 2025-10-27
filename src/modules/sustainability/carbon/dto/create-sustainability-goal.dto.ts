import { IsString, IsEnum, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSustainabilityGoalDto {
  @ApiProperty({ description: 'Goal name', example: 'Reduce Transport Emissions' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Goal description', example: 'Reduce transport emissions by 20% by end of year' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Target value', example: 1000 })
  @IsNumber()
  @Min(0)
  target: number;

  @ApiProperty({ description: 'Target unit', example: 'kg CO2' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Goal category', example: 'carbon_reduction', enum: ['carbon_reduction', 'waste_reduction', 'energy_efficiency', 'renewable_energy'] })
  @IsEnum(['carbon_reduction', 'waste_reduction', 'energy_efficiency', 'renewable_energy'])
  category: 'carbon_reduction' | 'waste_reduction' | 'energy_efficiency' | 'renewable_energy';

  @ApiProperty({ description: 'Goal deadline', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ description: 'Is goal active', example: true })
  @IsBoolean()
  isActive: boolean;
}
