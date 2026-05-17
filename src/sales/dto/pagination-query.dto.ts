import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PaginationQueryDto {
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

  @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({ description: 'Filtrar por caja' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  cashSessionId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: ['COMPLETED', 'CANCELLED', 'LAYAWAY'],
  })
  @IsIn(['COMPLETED', 'CANCELLED', 'LAYAWAY'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Desde (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ description: 'Buscar por folio, cliente o vendedor' })
  @IsString()
  @IsOptional()
  search?: string;
}
