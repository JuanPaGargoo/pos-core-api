import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductBarcodeDto } from './product-barcode.dto';
import { PRODUCT_SELL_TYPES } from './create-product.dto';

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'SKU / clave del producto',
    maxLength: 60,
  })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  sku?: string;

  @ApiPropertyOptional({ description: 'Nombre del producto', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría. Enviar null para quitarla.',
  })
  @IsInt()
  @IsOptional()
  categoryId?: number | null;

  @ApiPropertyOptional({ description: 'ID de la unidad de medida' })
  @IsInt()
  @IsOptional()
  unitId?: number;

  @ApiPropertyOptional({
    description: 'ID del impuesto. Enviar null para quitarlo.',
  })
  @IsInt()
  @IsOptional()
  taxId?: number | null;

  @ApiPropertyOptional({
    description: 'Modalidad de venta',
    enum: PRODUCT_SELL_TYPES,
  })
  @IsIn(PRODUCT_SELL_TYPES)
  @IsOptional()
  sellType?: string;

  @ApiPropertyOptional({
    description: 'Controla inventario para este producto',
  })
  @IsBoolean()
  @IsOptional()
  trackStock?: boolean;

  @ApiPropertyOptional({ description: 'URL de la imagen del producto' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    type: [ProductBarcodeDto],
    description: 'Si se envía, reemplaza por completo los códigos de barras',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductBarcodeDto)
  @IsOptional()
  barcodes?: ProductBarcodeDto[];
}
