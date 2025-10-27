import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto, TaskStatus, TaskPriority } from './create-task.dto';
import { IsOptional, IsEnum, IsString } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  actualDuration?: number; // in minutes

  @IsOptional()
  completedAt?: Date;
}
