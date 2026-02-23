import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const SETTING_SCOPES = ['global', 'branch'] as const;

export class UpsertSettingDto {
  @ApiProperty({
    description: 'Scope del setting',
    example: 'branch',
    enum: SETTING_SCOPES,
  })
  @IsString()
  @IsIn(SETTING_SCOPES)
  scope: string;

  @ApiPropertyOptional({
    description: 'ID de la sucursal (requerido cuando scope = branch)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  branchId?: number;

  @ApiProperty({
    description: 'Clave del setting',
    example: 'timezone',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({
    description: 'Valor del setting como JSON flexible',
    example: 'America/Mexico_City',
  })
  valueJson: unknown;
}
