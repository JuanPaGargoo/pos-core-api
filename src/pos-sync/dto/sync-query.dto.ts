import { IsDateString, IsInt, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BootstrapQueryDto {
  @ApiProperty({ description: 'ID de la sucursal a sincronizar' })
  @Type(() => Number)
  @IsInt()
  branchId: number;
}

export class DeltaQueryDto {
  @ApiProperty({ description: 'ID de la sucursal a sincronizar' })
  @Type(() => Number)
  @IsInt()
  branchId: number;

  @ApiPropertyOptional({
    description: 'Solo cambios posteriores a esta fecha (ISO)',
  })
  @IsDateString()
  @IsOptional()
  since?: string;
}
