import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Nombre de la categoría',
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'ID de la categoría padre. Enviar null para quitarla.',
    nullable: true,
  })
  @IsInt()
  @IsOptional()
  parentId?: number | null;
}
