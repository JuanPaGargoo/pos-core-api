import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeCustomerStatusDto {
  @ApiProperty({ description: 'Nuevo estado del cliente', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
