import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePrescriptionStatusDto {
  @ApiProperty({
    description: 'Nuevo estado de la receta',
    enum: ['ACTIVE', 'DISPENSED', 'CANCELLED'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVE', 'DISPENSED', 'CANCELLED'])
  status: string;
}
