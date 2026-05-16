import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class StockQueryDto {
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

  @ApiPropertyOptional({
    description: 'Búsqueda por nombre o SKU del producto',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por almacén' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  warehouseId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por producto' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional({
    description: 'Solo existencias en o por debajo del punto de reorden',
    example: 'true',
  })
  @IsBooleanString()
  @IsOptional()
  lowStock?: string;
}
