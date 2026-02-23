import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const LOCATION_TYPES = ['zone', 'aisle', 'rack', 'bin'] as const;

export class CreateLocationDto {
  @ApiProperty({
    description: 'ID del almacén al que pertenece la ubicación',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  warehouseId: number;

  @ApiProperty({
    description: 'Nombre de la ubicación',
    example: 'Zona A',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Código único de la ubicación',
    example: 'ZA-001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: 'Tipo de ubicación',
    example: 'zone',
    enum: LOCATION_TYPES,
  })
  @IsString()
  @IsIn(LOCATION_TYPES)
  type: string;

  @ApiPropertyOptional({
    description: 'ID de la ubicación padre (para jerarquía)',
    example: null,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    description: 'Estado activo de la ubicación',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
