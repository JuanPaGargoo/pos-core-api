import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUnitDto {
  @ApiProperty({
    description: 'Nombre de la unidad',
    example: 'Kilogramo',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Abreviatura', example: 'kg', maxLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  abbreviation: string;

  @ApiPropertyOptional({
    description: 'Permite cantidades con decimales (ej. 0.250 kg)',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowsDecimal?: boolean;
}
