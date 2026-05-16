import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SaleItemInputDto, SalePaymentInputDto } from './create-sale.dto';

/** One offline sale in a sync batch. Idempotent on `clientUuid`. */
export class SyncSaleDto {
  @ApiProperty({ description: 'UUID generado en el cliente (idempotencia)' })
  @IsUUID()
  clientUuid: string;

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

  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsInt()
  @IsOptional()
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Venta a crédito (fiado)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isCredit?: boolean;

  @ApiProperty({ description: 'Fecha/hora de la venta en el cliente (ISO)' })
  @IsDateString()
  soldAt: string;

  @ApiProperty({ type: [SaleItemInputDto], description: 'Líneas de la venta' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items: SaleItemInputDto[];

  @ApiPropertyOptional({ type: [SalePaymentInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  @IsOptional()
  payments?: SalePaymentInputDto[];
}

export class SyncSalesDto {
  @ApiProperty({ type: [SyncSaleDto], description: 'Lote de ventas offline' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SyncSaleDto)
  sales: SyncSaleDto[];
}
