import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateWarehouseDto {
  @ApiProperty({
    description: 'ID de la sucursal a la que pertenece el almacén',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  branchId: number;

  @ApiProperty({
    description: 'Nombre del almacén',
    example: 'Almacén Principal',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Código único del almacén',
    example: 'ALM-001',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'Estado activo del almacén',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
