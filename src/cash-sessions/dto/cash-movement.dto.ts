import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CashMovementDto {
  @ApiProperty({ description: 'Tipo de movimiento', enum: ['IN', 'OUT'] })
  @IsIn(['IN', 'OUT'])
  type: string;

  @ApiProperty({ description: 'Monto del movimiento', example: 200 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Motivo (retiro, gasto, ingreso…)',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason: string;
}
