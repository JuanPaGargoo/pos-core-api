import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BranchAssignmentDto {
  @ApiProperty({ description: 'ID de la sucursal', example: 1 })
  @IsInt()
  branchId: number;

  @ApiPropertyOptional({
    description: 'Indica si esta es la sucursal predeterminada del usuario',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class AssignBranchesDto {
  @ApiProperty({
    description:
      'Lista de sucursales a asignar al usuario (reemplaza las actuales)',
    type: [BranchAssignmentDto],
    example: [{ branchId: 1, isDefault: true }, { branchId: 2 }],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BranchAssignmentDto)
  branches: BranchAssignmentDto[];
}
