import { IsArray, IsInt, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignPermissionsDto {
  @ApiProperty({
    description:
      'Lista de IDs de permisos a asignar al rol (reemplaza los actuales)',
    example: [1, 2, 5],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  permissionIds: number[];
}
