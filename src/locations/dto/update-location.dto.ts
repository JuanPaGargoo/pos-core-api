import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LOCATION_TYPES } from './create-location.dto';

export class UpdateLocationDto {
  @ApiPropertyOptional({
    description: 'Nombre de la ubicación',
    example: 'Zona B',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Código único de la ubicación',
    example: 'ZB-001',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Tipo de ubicación',
    example: 'aisle',
    enum: LOCATION_TYPES,
  })
  @IsString()
  @IsIn(LOCATION_TYPES)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description:
      'ID de la ubicación padre (para jerarquía). Enviar null para quitar el padre.',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  parentId?: number | null;

  @ApiPropertyOptional({
    description: 'Estado activo de la ubicación',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
