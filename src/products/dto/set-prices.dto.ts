import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductPriceInputDto } from './product-price.dto';

export class SetProductPricesDto {
  @ApiProperty({
    type: [ProductPriceInputDto],
    description: 'Reemplaza por completo los precios del producto',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceInputDto)
  prices: ProductPriceInputDto[];
}
