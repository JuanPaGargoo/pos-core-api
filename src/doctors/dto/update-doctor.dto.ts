import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDoctorDto {
  @ApiPropertyOptional({ description: 'Nombre del médico' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Cédula profesional' })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  license?: string;

  @ApiPropertyOptional({ description: 'Especialidad' })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  specialty?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
