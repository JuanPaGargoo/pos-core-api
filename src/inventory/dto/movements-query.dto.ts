import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const MOVEMENT_TYPES = [
  'SALE',
  'PURCHASE',
  'RETURN',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INITIAL',
] as const;

export class MovementsQueryDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Registros por página',
    example: 25,
    default: 25,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtrar por producto' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por almacén' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Tipo de movimiento',
    enum: MOVEMENT_TYPES,
  })
  @IsIn(MOVEMENT_TYPES)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Desde (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
