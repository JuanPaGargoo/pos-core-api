import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: 'Nuevo nombre del rol',
    example: 'supervisor',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Nueva descripción del rol',
    example: 'Supervisor de turno',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
