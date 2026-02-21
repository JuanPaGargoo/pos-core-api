import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignRolesDto {
  @ApiProperty({
    description:
      'Lista de IDs de roles a asignar al usuario (reemplaza los actuales)',
    example: [1, 2],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Type(() => Number)
  roleIds: number[];
}
