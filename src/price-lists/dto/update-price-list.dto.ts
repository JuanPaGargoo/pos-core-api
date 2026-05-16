import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePriceListDto {
  @ApiPropertyOptional({
    description: 'Nombre de la lista de precios',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Marca esta lista como la predeterminada',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
