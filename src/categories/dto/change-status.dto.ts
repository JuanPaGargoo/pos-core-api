import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeCategoryStatusDto {
  @ApiProperty({ description: 'Nuevo estado de la categoría', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
