import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterPaymentDto {
  @ApiProperty({ description: 'Monto del abono', example: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Método de pago del abono' })
  @IsInt()
  @IsOptional()
  paymentMethodId?: number;

  @ApiPropertyOptional({ description: 'Nota del abono', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string;
}
