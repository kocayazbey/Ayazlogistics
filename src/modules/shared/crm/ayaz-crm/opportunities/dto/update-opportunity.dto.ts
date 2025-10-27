import { PartialType } from '@nestjs/swagger';
import { CreateOpportunityDto } from './create-opportunity.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOpportunityDto extends PartialType(CreateOpportunityDto) {
  @ApiPropertyOptional({ description: 'Opportunity stage', enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] })
  @IsOptional()
  @IsEnum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])
  stage?: string;

  @ApiPropertyOptional({ description: 'Opportunity status', enum: ['open', 'won', 'lost'] })
  @IsOptional()
  @IsEnum(['open', 'won', 'lost'])
  status?: string;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  updateNotes?: string;
}
