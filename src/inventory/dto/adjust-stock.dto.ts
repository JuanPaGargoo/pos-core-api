import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdjustStockDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'ID del almacén' })
  @IsInt()
  warehouseId: number;

  @ApiProperty({
    description: 'Existencia física contada (cantidad absoluta resultante)',
    example: 24,
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  newQuantity: number;

  @ApiPropertyOptional({ description: 'Motivo del ajuste', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  reason?: string;
}
