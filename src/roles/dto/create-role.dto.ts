import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Nombre único del rol',
    example: 'manager',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Gerente de sucursal con acceso a reportes y usuarios',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
