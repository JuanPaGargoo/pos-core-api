import { IsInt, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OpenSessionDto {
  @ApiProperty({ description: 'ID de la sucursal' })
  @IsInt()
  branchId: number;

  @ApiProperty({ description: 'Fondo inicial de caja', example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingAmount: number;
}
