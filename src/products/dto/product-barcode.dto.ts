import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductBarcodeDto {
  @ApiProperty({
    description: 'Código de barras',
    example: '7501234567890',
    maxLength: 60,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  code: string;

  @ApiPropertyOptional({
    description: 'Marca este código como el principal del producto',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Unidades que representa el código (ej. caja de 12)',
    example: 1,
    default: 1,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  @IsOptional()
  packQuantity?: number;
}
