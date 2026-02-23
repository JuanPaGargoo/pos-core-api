import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SETTING_SCOPES } from './upsert-setting.dto';

export class QuerySettingsDto {
  @ApiPropertyOptional({
    description: 'Filtrar por scope',
    example: 'branch',
    enum: SETTING_SCOPES,
  })
  @IsString()
  @IsIn(SETTING_SCOPES)
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({
    description:
      'Filtrar por ID de sucursal (activa fallback a global para claves faltantes)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por clave específica',
    example: 'timezone',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  key?: string;
}
