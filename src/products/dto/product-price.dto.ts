import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductPriceInputDto {
  @ApiProperty({ description: 'ID de la lista de precios' })
  @IsInt()
  priceListId: number;

  @ApiPropertyOptional({
    description: 'ID de la sucursal. Omitir para un precio aplicable a todas.',
  })
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiPropertyOptional({
    description: 'Costo del producto',
    example: 8.5,
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  cost?: number;

  @ApiProperty({ description: 'Precio de venta', example: 12.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
}
