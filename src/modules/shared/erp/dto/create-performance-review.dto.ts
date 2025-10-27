import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsUUID, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewType {
  PROBATION = 'probation',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
  PROJECT_BASED = 'project_based',
  AD_HOC = 'ad_hoc',
}

export enum ReviewStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ACKNOWLEDGED = 'acknowledged',
  APPEALED = 'appealed',
}

export enum OverallRating {
  UNSATISFACTORY = 'unsatisfactory',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  MEETS_EXPECTATIONS = 'meets_expectations',
  EXCEEDS_EXPECTATIONS = 'exceeds_expectations',
  OUTSTANDING = 'outstanding',
}

export class ReviewCriteriaDto {
  @ApiProperty({ example: 'Job Knowledge' })
  @IsString()
  @IsNotEmpty()
  criteriaName: string;

  @ApiProperty({ example: 4, description: 'Rating (1-5 scale)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Demonstrates excellent understanding of warehouse operations', required: false })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiProperty({ example: 30, description: 'Weight percentage for this criteria', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  weight?: number;
}

export class CreatePerformanceReviewDto {
  @ApiProperty({ example: 'REV-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  reviewNumber: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Employee being reviewed' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Reviewer (manager) ID' })
  @IsUUID()
  @IsNotEmpty()
  reviewerId: string;

  @ApiProperty({ enum: ReviewType, example: ReviewType.ANNUAL })
  @IsEnum(ReviewType)
  @IsNotEmpty()
  reviewType: ReviewType;

  @ApiProperty({ example: '2025-01-01', description: 'Review period start' })
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({ example: '2025-12-31', description: 'Review period end' })
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiProperty({ example: '2025-10-24', description: 'Review date' })
  @IsDateString()
  @IsNotEmpty()
  reviewDate: string;

  @ApiProperty({ type: [ReviewCriteriaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewCriteriaDto)
  @IsNotEmpty()
  criteria: ReviewCriteriaDto[];

  @ApiProperty({ enum: OverallRating, example: OverallRating.EXCEEDS_EXPECTATIONS })
  @IsEnum(OverallRating)
  @IsNotEmpty()
  overallRating: OverallRating;

  @ApiProperty({ example: 4.2, description: 'Overall score (1-5)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(5)
  overallScore?: number;

  @ApiProperty({ example: 'Excellent performance throughout the year. Strong leadership skills demonstrated.', description: 'Strengths' })
  @IsString()
  @IsNotEmpty()
  strengths: string;

  @ApiProperty({ example: 'Could improve time management and delegation skills.', description: 'Areas for improvement' })
  @IsString()
  @IsNotEmpty()
  areasForImprovement: string;

  @ApiProperty({ example: 'Complete leadership training program, delegate more routine tasks to team.', description: 'Development goals' })
  @IsString()
  @IsNotEmpty()
  developmentGoals: string;

  @ApiProperty({ example: 'Recommended for promotion to Senior Warehouse Manager', description: 'Recommendations', required: false })
  @IsString()
  @IsOptional()
  recommendations?: string;

  @ApiProperty({ example: 10, description: 'Recommended salary increase percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salaryIncreaseRecommendation?: number;

  @ApiProperty({ example: 15000, description: 'Recommended bonus amount', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonusRecommendation?: number;

  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.COMPLETED, required: false })
  @IsEnum(ReviewStatus)
  @IsOptional()
  status?: ReviewStatus;

  @ApiProperty({ example: '2025-10-26', description: 'Date employee acknowledged review', required: false })
  @IsDateString()
  @IsOptional()
  acknowledgedDate?: string;

  @ApiProperty({ example: 'Employee agrees with review and development plan', description: 'Employee comments', required: false })
  @IsString()
  @IsOptional()
  employeeComments?: string;

  @ApiProperty({ example: 'signature_base64_data', description: 'Reviewer signature', required: false })
  @IsString()
  @IsOptional()
  reviewerSignature?: string;

  @ApiProperty({ example: 'signature_base64_data', description: 'Employee signature', required: false })
  @IsString()
  @IsOptional()
  employeeSignature?: string;

  @ApiProperty({ example: 'Exceptional performance year', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

