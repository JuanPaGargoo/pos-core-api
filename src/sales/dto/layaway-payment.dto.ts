import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddLayawayPaymentDto {
  @ApiProperty({ description: 'Método de pago del abono' })
  @IsInt()
  paymentMethodId: number;

  @ApiProperty({ description: 'Monto del abono', example: 100 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'Referencia del pago' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  reference?: string;
}
