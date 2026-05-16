import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Nombre del cliente', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Teléfono', maxLength: 50 })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'RFC', maxLength: 13 })
  @IsString()
  @IsOptional()
  @MaxLength(13)
  rfc?: string;

  @ApiPropertyOptional({ description: 'Régimen fiscal (CFDI)', maxLength: 10 })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  fiscalRegime?: string;

  @ApiPropertyOptional({ description: 'Uso de CFDI', maxLength: 10 })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  cfdiUse?: string;

  @ApiPropertyOptional({ description: 'Lista de precios asignada al cliente' })
  @IsInt()
  @IsOptional()
  priceListId?: number;

  @ApiPropertyOptional({
    description: 'Habilita ventas a crédito',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  creditEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Límite de crédito', default: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
