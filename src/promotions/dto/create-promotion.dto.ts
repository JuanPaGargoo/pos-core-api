import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PROMOTION_TYPES = ['PERCENT', 'FIXED', 'NXM'] as const;
export const PROMOTION_SCOPES = ['PRODUCT', 'CATEGORY'] as const;

export class CreatePromotionDto {
  @ApiProperty({ description: 'Nombre de la promoción', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'Tipo de promoción', enum: PROMOTION_TYPES })
  @IsIn(PROMOTION_TYPES)
  type: string;

  @ApiPropertyOptional({
    description: 'Porcentaje (0-100) o monto fijo de descuento',
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiPropertyOptional({ description: 'NxM: cantidad a comprar (N)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  buyQty?: number;

  @ApiPropertyOptional({ description: 'NxM: cantidad a pagar (M)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  payQty?: number;

  @ApiProperty({
    description: 'Ámbito de la promoción',
    enum: PROMOTION_SCOPES,
  })
  @IsIn(PROMOTION_SCOPES)
  scope: string;

  @ApiPropertyOptional({ description: 'ID del producto (ámbito PRODUCT)' })
  @IsInt()
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional({ description: 'ID de la categoría (ámbito CATEGORY)' })
  @IsInt()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Inicio de vigencia (ISO)' })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Fin de vigencia (ISO)' })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
