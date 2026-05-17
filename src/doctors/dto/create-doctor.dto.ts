import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
  @ApiProperty({ description: 'Nombre del médico', example: 'Dra. Ana López' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Cédula profesional',
    example: '12345678',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  license: string;

  @ApiPropertyOptional({ description: 'Especialidad', example: 'Pediatría' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
