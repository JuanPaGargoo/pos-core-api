import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PAYMENT_METHOD_TYPES = ['cash', 'card', 'transfer'] as const;

export class CreatePaymentMethodDto {
  @ApiProperty({
    description: 'Nombre del método de pago',
    example: 'Efectivo',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Tipo de método de pago',
    example: 'cash',
    enum: PAYMENT_METHOD_TYPES,
  })
  @IsString()
  @IsIn(PAYMENT_METHOD_TYPES)
  type: string;

  @ApiPropertyOptional({
    description:
      'Indica si el método de pago requiere referencia (ej. número de autorización)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresReference?: boolean;

  @ApiPropertyOptional({
    description: 'Estado activo del método de pago',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
