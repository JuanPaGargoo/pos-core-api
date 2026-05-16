import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeSupplierStatusDto {
  @ApiProperty({ description: 'Nuevo estado del proveedor', example: false })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
