import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENT_METHOD_TYPES } from './create-payment-method.dto';

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({
    description: 'Nombre del método de pago',
    example: 'Tarjeta de Crédito',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Tipo de método de pago',
    example: 'card',
    enum: PAYMENT_METHOD_TYPES,
  })
  @IsString()
  @IsIn(PAYMENT_METHOD_TYPES)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    description: 'Indica si el método de pago requiere referencia',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  requiresReference?: boolean;
}
