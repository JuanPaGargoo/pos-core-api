import { IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetReorderPointDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'ID del almacén' })
  @IsInt()
  warehouseId: number;

  @ApiProperty({ description: 'Punto de reorden', example: 5 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  reorderPoint: number;
}
