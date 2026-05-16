import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PROMOTION_TYPES, PROMOTION_SCOPES } from './create-promotion.dto';

export class UpdatePromotionDto {
  @ApiPropertyOptional({
    description: 'Nombre de la promoción',
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Tipo de promoción',
    enum: PROMOTION_TYPES,
  })
  @IsIn(PROMOTION_TYPES)
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Porcentaje o monto fijo de descuento' })
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

  @ApiPropertyOptional({ description: 'Ámbito', enum: PROMOTION_SCOPES })
  @IsIn(PROMOTION_SCOPES)
  @IsOptional()
  scope?: string;

  @ApiPropertyOptional({ description: 'ID del producto' })
  @IsInt()
  @IsOptional()
  productId?: number | null;

  @ApiPropertyOptional({ description: 'ID de la categoría' })
  @IsInt()
  @IsOptional()
  categoryId?: number | null;

  @ApiPropertyOptional({ description: 'Inicio de vigencia (ISO)' })
  @IsDateString()
  @IsOptional()
  startsAt?: string | null;

  @ApiPropertyOptional({ description: 'Fin de vigencia (ISO)' })
  @IsDateString()
  @IsOptional()
  endsAt?: string | null;
}
