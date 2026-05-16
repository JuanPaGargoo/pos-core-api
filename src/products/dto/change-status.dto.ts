import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeProductStatusDto {
  @ApiProperty({ description: 'Nuevo estado del producto', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
