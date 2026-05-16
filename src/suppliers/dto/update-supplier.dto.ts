import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ description: 'Nombre del proveedor', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'RFC', maxLength: 13 })
  @IsString()
  @IsOptional()
  @MaxLength(13)
  rfc?: string;

  @ApiPropertyOptional({ description: 'Nombre de contacto', maxLength: 150 })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
