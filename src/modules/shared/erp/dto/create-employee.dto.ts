import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsPhoneNumber, IsNumber, IsDateString, IsBoolean, Min } from 'class-validator';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  TEMPORARY = 'temporary',
  INTERN = 'intern',
  SEASONAL = 'seasonal',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

export class CreateEmployeeDto {
  @ApiProperty({ example: 'EMP-2025-001' })
  @IsString()
  @IsNotEmpty()
  employeeNumber: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+905551234567' })
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '12345678901', description: 'Turkish ID number (TC Kimlik)' })
  @IsString()
  @IsNotEmpty()
  nationalId: string;

  @ApiProperty({ example: '1985-06-15', description: 'Date of birth' })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @ApiProperty({ enum: MaritalStatus, example: MaritalStatus.MARRIED, required: false })
  @IsEnum(MaritalStatus)
  @IsOptional()
  maritalStatus?: MaritalStatus;

  @ApiProperty({ example: 'Kadikoy, Istanbul, Turkey' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Istanbul' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Turkey' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '34000', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: 'Warehouse Manager' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({ example: 'DEPT-OPS', description: 'Department code' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Direct manager/supervisor user ID', required: false })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiProperty({ enum: EmploymentType, example: EmploymentType.FULL_TIME })
  @IsEnum(EmploymentType)
  @IsNotEmpty()
  employmentType: EmploymentType;

  @ApiProperty({ example: '2020-01-15', description: 'Hire date' })
  @IsDateString()
  @IsNotEmpty()
  hireDate: string;

  @ApiProperty({ example: '2025-01-15', description: 'Probation end date', required: false })
  @IsDateString()
  @IsOptional()
  probationEndDate?: string;

  @ApiProperty({ example: 75000, description: 'Annual gross salary' })
  @IsNumber()
  @Min(0)
  salary: number;

  @ApiProperty({ example: 'TRY', description: 'Salary currency', required: false })
  @IsString()
  @IsOptional()
  salaryCurrency?: string;

  @ApiProperty({ example: 'TR330006100519786457841326', description: 'Bank account IBAN for salary', required: false })
  @IsString()
  @IsOptional()
  bankAccountIban?: string;

  @ApiProperty({ example: '1234567890', description: 'SGK registration number', required: false })
  @IsString()
  @IsOptional()
  sgkNumber?: string;

  @ApiProperty({ example: '9876543210', description: 'Tax office number', required: false })
  @IsString()
  @IsOptional()
  taxOfficeNumber?: string;

  @ApiProperty({ example: 'Kadikoy Tax Office', description: 'Tax office name', required: false })
  @IsString()
  @IsOptional()
  taxOfficeName?: string;

  @ApiProperty({ example: 'Master of Business Administration', description: 'Education level', required: false })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiProperty({ example: 'Emergency Contact: +905559876543 (Wife)', required: false })
  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @ApiProperty({ example: 'No known allergies', description: 'Medical notes', required: false })
  @IsString()
  @IsOptional()
  medicalNotes?: string;

  @ApiProperty({ example: true, description: 'Has driving license', required: false })
  @IsBoolean()
  @IsOptional()
  hasDrivingLicense?: boolean;

  @ApiProperty({ example: 'B, C', description: 'Driving license class', required: false })
  @IsString()
  @IsOptional()
  drivingLicenseClass?: string;

  @ApiProperty({ enum: EmployeeStatus, example: EmployeeStatus.ACTIVE, required: false })
  @IsEnum(EmployeeStatus)
  @IsOptional()
  status?: EmployeeStatus;

  @ApiProperty({ example: 'Excellent performer, eligible for promotion', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

