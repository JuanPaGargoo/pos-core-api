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
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Registros por página', default: 25 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtrar por médico' })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  doctorId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: ['ACTIVE', 'DISPENSED', 'CANCELLED'],
  })
  @IsIn(['ACTIVE', 'DISPENSED', 'CANCELLED'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Buscar por folio o paciente' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Desde (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta (fecha ISO)' })
  @IsDateString()
  @IsOptional()
  to?: string;
}
