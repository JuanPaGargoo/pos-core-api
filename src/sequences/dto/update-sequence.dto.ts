import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSequenceDto {
  @ApiPropertyOptional({
    description: 'Prefijo del folio (ej. "INV-", "REC-")',
    example: 'INV-',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsOptional()
  prefix?: string;

  @ApiPropertyOptional({
    description:
      'Próximo número a emitir (útil para resetear o ajustar la secuencia)',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  nextNumber?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de dígitos del número (con ceros a la izquierda)',
    example: 6,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  padding?: number;
}
