import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @ApiProperty({ description: 'ID del producto recetado' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  productId: number;

  @ApiProperty({ description: 'Cantidad recetada' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ description: 'Dosis e indicaciones' })
  @IsString()
  @IsOptional()
  dosage?: string;
}

export class CreatePrescriptionDto {
  @ApiProperty({ description: 'Folio de la receta', example: 'REC-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  folio: string;

  @ApiProperty({ description: 'ID de la sucursal' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  branchId: number;

  @ApiProperty({ description: 'ID del médico que emite la receta' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  doctorId: number;

  @ApiPropertyOptional({ description: 'ID del cliente / paciente registrado' })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Nombre del paciente (si no es cliente)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  patientName?: string;

  @ApiPropertyOptional({ description: 'Diagnóstico' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Fecha de emisión de la receta (ISO)' })
  @IsDateString()
  issuedAt: string;

  @ApiProperty({
    description: 'Productos recetados',
    type: [PrescriptionItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
