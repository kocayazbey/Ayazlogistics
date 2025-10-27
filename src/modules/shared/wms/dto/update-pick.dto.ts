import { PartialType } from '@nestjs/swagger';
import { CreatePickDto } from './create-pick.dto';

export class UpdatePickDto extends PartialType(CreatePickDto) {}
