import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeTaxStatusDto {
  @ApiProperty({ description: 'Nuevo estado del impuesto', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
