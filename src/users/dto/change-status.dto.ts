import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeStatusDto {
  @ApiProperty({
    description: 'Nuevo estado del usuario',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
