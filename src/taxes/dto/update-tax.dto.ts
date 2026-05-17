import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaxDto {
  @ApiPropertyOptional({ description: 'Nombre del impuesto' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Tasa porcentual (0-100)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  rate?: number;

  @ApiPropertyOptional({ description: 'El precio ya incluye el impuesto' })
  @IsBoolean()
  @IsOptional()
  isIncluded?: boolean;
}
