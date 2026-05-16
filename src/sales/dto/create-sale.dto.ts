import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
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

export class SaleItemInputDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Cantidad vendida', example: 2 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario cobrado', example: 15 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Descuento de la línea', default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({
    description: 'ID de la promoción aplicada a la línea',
  })
  @IsInt()
  @IsOptional()
  promotionId?: number;
}

export class SalePaymentInputDto {
  @ApiProperty({ description: 'ID del método de pago' })
  @IsInt()
  paymentMethodId: number;

  @ApiProperty({ description: 'Monto recibido con este método', example: 30 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Referencia (autorización, folio…)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;
}

export class CreateSaleDto {
  @ApiProperty({ description: 'ID de la sucursal' })
  @IsInt()
  branchId: number;

  @ApiProperty({ description: 'ID del almacén que surte la venta' })
  @IsInt()
  warehouseId: number;

  @ApiPropertyOptional({ description: 'ID de la caja abierta' })
  @IsInt()
  @IsOptional()
  cashSessionId?: number;

  @ApiPropertyOptional({ description: 'Fecha/hora de la venta (ISO)' })
  @IsDateString()
  @IsOptional()
  soldAt?: string;

  @ApiPropertyOptional({
    description: 'ID del cliente (obligatorio si es a crédito)',
  })
  @IsInt()
  @IsOptional()
  customerId?: number;

  @ApiPropertyOptional({
    description:
      'Marca la venta como a crédito: el saldo no pagado se carga a la cuenta del cliente',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isCredit?: boolean;

  @ApiProperty({ type: [SaleItemInputDto], description: 'Líneas de la venta' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items: SaleItemInputDto[];

  @ApiPropertyOptional({
    type: [SalePaymentInputDto],
    description: 'Pagos recibidos. Puede ir vacío en una venta a crédito.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  @IsOptional()
  payments?: SalePaymentInputDto[];
}
