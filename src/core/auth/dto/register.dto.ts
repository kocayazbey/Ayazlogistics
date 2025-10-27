import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @IsNotEmpty({ message: 'Email gereklidir' })
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString({ message: 'Şifre gereklidir' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString({ message: 'Ad gereklidir' })
  @IsNotEmpty({ message: 'Ad gereklidir' })
  name: string;

  @ApiProperty({ example: 'customer', enum: ['admin', 'manager', 'driver', 'customer'] })
  @IsOptional()
  @IsIn(['admin', 'manager', 'driver', 'customer'], { message: 'Geçersiz rol' })
  role?: string;
}