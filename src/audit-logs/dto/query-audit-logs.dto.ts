import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QueryAuditLogsDto {
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

  @ApiPropertyOptional({ description: 'Filtrar por ID de usuario', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  userId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de sucursal',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por acción',
    example: 'CREATE',
    enum: [
      'LOGIN',
      'CREATE',
      'UPDATE',
      'DELETE',
      'STATUS_CHANGE',
      'PERMISSION_CHANGE',
    ],
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  action?: string;

  @ApiPropertyOptional({ description: 'Filtrar por entidad', example: 'User' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  entity?: string;

  @ApiPropertyOptional({
    description: 'Fecha de inicio (ISO 8601)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin (ISO 8601)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  to?: string;
}
