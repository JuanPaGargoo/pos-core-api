import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUnitDto {
  @ApiPropertyOptional({ description: 'Nombre de la unidad', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: 'Abreviatura', maxLength: 10 })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Permite cantidades con decimales' })
  @IsBoolean()
  @IsOptional()
  allowsDecimal?: boolean;
}
