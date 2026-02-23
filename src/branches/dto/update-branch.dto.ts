import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto {
  @ApiPropertyOptional({
    description: 'Nombre de la sucursal',
    example: 'Sucursal Centro Actualizada',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Código único de la sucursal',
    example: 'SUC-001-B',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Dirección física de la sucursal',
    example: 'Av. Reforma 456, Col. Polanco',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Teléfono de la sucursal',
    example: '+52 55 9876 5432',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Zona horaria de la sucursal (formato IANA)',
    example: 'America/Monterrey',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Estado activo de la sucursal',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
