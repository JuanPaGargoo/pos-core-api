import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const REFUND_METHODS = [
  'CASH',
  'CREDIT_NOTE',
  'CREDIT_BALANCE',
] as const;

export class ReturnItemInputDto {
  @ApiProperty({ description: 'ID de la línea de venta original' })
  @IsInt()
  saleItemId: number;

  @ApiProperty({ description: 'Cantidad a devolver', example: 1 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Reingresar el producto al inventario',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  restock?: boolean;
}

export class CreateReturnDto {
  @ApiProperty({ description: 'ID de la venta a devolver' })
  @IsInt()
  saleId: number;

  @ApiProperty({ description: 'Motivo de la devolución', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: 'Forma de reembolso',
    enum: REFUND_METHODS,
  })
  @IsIn(REFUND_METHODS)
  refundMethod: string;

  @ApiProperty({ type: [ReturnItemInputDto], description: 'Líneas a devolver' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemInputDto)
  items: ReturnItemInputDto[];
}
