import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensResponseDto {
  @ApiProperty({
    description: 'Token de acceso JWT (expira en 15 minutos)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de refresco JWT (expira en 7 días)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthTokensResponseDto })
  data: AuthTokensResponseDto;

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}

class RoleDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'admin' })
  name: string;

  @ApiProperty({ example: 'Administrador del sistema', nullable: true })
  description: string | null;
}

class BranchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Sucursal Central' })
  name: string;

  @ApiProperty({ example: 'SUC-001' })
  code: string;

  @ApiProperty({ example: true })
  isDefault: boolean;
}

class MeDataDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Admin' })
  name: string;

  @ApiProperty({ example: 'admin@local' })
  email: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-02-18T12:00:00.000Z', nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ type: [RoleDto] })
  roles: RoleDto[];

  @ApiProperty({ type: [BranchDto] })
  branches: BranchDto[];
}

export class MeResponseDto {
  @ApiProperty({ type: MeDataDto })
  data: MeDataDto;

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}

export class PermissionsResponseDto {
  @ApiProperty({
    type: [String],
    example: ['users.create', 'users.read', 'roles.update'],
  })
  data: string[];

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}

export class LogoutResponseDto {
  @ApiProperty({
    example: { message: 'Sesión cerrada exitosamente' },
  })
  data: { message: string };

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}
