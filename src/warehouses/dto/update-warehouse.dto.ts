import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWarehouseDto {
  @ApiPropertyOptional({
    description: 'Nombre del almacén',
    example: 'Almacén Secundario',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Código único del almacén',
    example: 'ALM-002',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    description: 'Estado activo del almacén',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
