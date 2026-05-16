import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Nombre del cliente', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

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

  @ApiPropertyOptional({
    description: 'Lista de precios. Enviar null para quitarla.',
  })
  @IsInt()
  @IsOptional()
  priceListId?: number | null;

  @ApiPropertyOptional({ description: 'Habilita ventas a crédito' })
  @IsBoolean()
  @IsOptional()
  creditEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Límite de crédito' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  creditLimit?: number;
}
