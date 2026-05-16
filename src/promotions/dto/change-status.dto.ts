import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePromotionStatusDto {
  @ApiProperty({ description: 'Nuevo estado de la promoción', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
