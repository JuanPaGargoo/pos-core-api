import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeDoctorStatusDto {
  @ApiProperty({ description: 'Nuevo estado del médico', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
