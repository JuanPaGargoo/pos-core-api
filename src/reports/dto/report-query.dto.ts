import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por sucursal' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({ description: 'Desde (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({
    description: 'Máximo de filas a devolver',
    default: 10,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number;
}
