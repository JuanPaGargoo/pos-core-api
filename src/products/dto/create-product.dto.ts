import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductBarcodeDto } from './product-barcode.dto';
import { ProductPriceInputDto } from './product-price.dto';

export const PRODUCT_SELL_TYPES = ['UNIT', 'WEIGHT'] as const;

export class CreateProductDto {
  @ApiProperty({
    description: 'SKU / clave del producto',
    example: 'COCA-600',
    maxLength: 60,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  sku: string;

  @ApiProperty({
    description: 'Nombre del producto',
    example: 'Coca-Cola 600ml',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID de la categoría' })
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ description: 'ID de la unidad de medida' })
  @IsInt()
  unitId: number;

  @ApiPropertyOptional({ description: 'ID del impuesto aplicable' })
  @IsInt()
  @IsOptional()
  taxId?: number;

  @ApiPropertyOptional({
    description: 'Modalidad de venta',
    enum: PRODUCT_SELL_TYPES,
    default: 'UNIT',
  })
  @IsIn(PRODUCT_SELL_TYPES)
  @IsOptional()
  sellType?: string;

  @ApiPropertyOptional({
    description: 'Controla inventario para este producto',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  trackStock?: boolean;

  @ApiPropertyOptional({
    description: 'Requiere receta médica para su venta',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresPrescription?: boolean;

  @ApiPropertyOptional({
    description: 'Grupo/fracción de control COFEPRIS (medicamento controlado)',
    example: 'III',
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  controlledGroup?: string;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'URL de la imagen del producto' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    type: [ProductBarcodeDto],
    description: 'Códigos de barras',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ProductBarcodeDto)
  @IsOptional()
  barcodes?: ProductBarcodeDto[];

  @ApiPropertyOptional({
    type: [ProductPriceInputDto],
    description: 'Precios por lista',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceInputDto)
  @IsOptional()
  prices?: ProductPriceInputDto[];
}
