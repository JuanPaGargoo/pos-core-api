import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({
    description: 'Nombre de la sucursal',
    example: 'Sucursal Centro',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Código único de la sucursal',
    example: 'SUC-001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'Dirección física de la sucursal',
    example: 'Av. Independencia 123, Col. Centro',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de la sucursal',
    example: '+52 55 1234 5678',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Zona horaria de la sucursal (formato IANA)',
    example: 'America/Mexico_City',
    maxLength: 50,
    default: 'UTC',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Estado activo de la sucursal',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
