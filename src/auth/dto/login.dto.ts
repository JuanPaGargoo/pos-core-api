import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Correo electrónico del usuario',
    example: 'admin@gmail.com',
  })
  @IsEmail({ require_tld: false })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'admin123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
