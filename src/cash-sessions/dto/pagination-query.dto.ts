import { IsIn, IsInt, IsOptional, IsPositive, Min } from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: ['OPEN', 'CLOSED'],
  })
  @IsIn(['OPEN', 'CLOSED'])
  @IsOptional()
  status?: string;
}
