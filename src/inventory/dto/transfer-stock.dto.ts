import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransferStockDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Almacén de origen' })
  @IsInt()
  fromWarehouseId: number;

  @ApiProperty({ description: 'Almacén de destino' })
  @IsInt()
  toWarehouseId: number;

  @ApiProperty({ description: 'Cantidad a traspasar', example: 10 })
  @IsNumber({ maxDecimalPlaces: 3 })
  quantity: number;

  @ApiPropertyOptional({ description: 'Nota del traspaso', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string;
}
