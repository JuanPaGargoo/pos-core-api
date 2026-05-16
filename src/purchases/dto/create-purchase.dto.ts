import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseItemInputDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Cantidad recibida', example: 24 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: 'Costo unitario', example: 8.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ description: 'ID de la sucursal' })
  @IsInt()
  branchId: number;

  @ApiProperty({ description: 'ID del almacén que recibe la mercancía' })
  @IsInt()
  warehouseId: number;

  @ApiProperty({ description: 'ID del proveedor' })
  @IsInt()
  supplierId: number;

  @ApiPropertyOptional({ description: 'Referencia de factura del proveedor' })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  invoiceRef?: string;

  @ApiProperty({
    type: [PurchaseItemInputDto],
    description: 'Líneas de la compra',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInputDto)
  items: PurchaseItemInputDto[];
}
