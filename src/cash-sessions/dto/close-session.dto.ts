import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CloseSessionDto {
  @ApiProperty({
    description: 'Efectivo contado en caja al cierre',
    example: 1850.5,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  closingAmount: number;
}
