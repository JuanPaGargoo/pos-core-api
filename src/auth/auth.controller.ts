import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  MeResponseDto,
  PermissionsResponseDto,
  LogoutResponseDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
    name: string;
  };
}

@ApiTags('Autenticación')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ──────────────────────────────────────────────
  // POST /auth/login
  // ──────────────────────────────────────────────
  @Post('auth/login')
  @ApiOperation({ summary: 'Iniciar sesión con email o username y contraseña' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna access token y refresh token.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    const tokens = await this.authService.login(
      loginDto.identifier,
      loginDto.password,
    );

    return {
      data: tokens,
      meta: {},
    };
  }

  // ──────────────────────────────────────────────
  // POST /auth/refresh
  // ──────────────────────────────────────────────
  @Post('auth/refresh')
  @ApiOperation({ summary: 'Renovar access token usando refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Token renovado exitosamente.',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    const tokens = await this.authService.refresh(refreshTokenDto.refreshToken);

    return {
      data: tokens,
      meta: {},
    };
  }

  // ──────────────────────────────────────────────
  // POST /auth/logout
  // ──────────────────────────────────────────────
  @Post('auth/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cerrar sesión (invalida el refresh token)' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente.',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  logout(@Body() refreshTokenDto: RefreshTokenDto) {
    this.authService.logout(refreshTokenDto.refreshToken);

    return {
      data: { message: 'Sesión cerrada exitosamente' },
      meta: {},
    };
  }

  // ──────────────────────────────────────────────
  // GET /me
  // ──────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener datos del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Datos del usuario autenticado con roles y sucursales.',
    type: MeResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getMe(@Req() req: AuthenticatedRequest) {
    const user = await this.authService.getMe(req.user.id);

    return {
      data: user,
      meta: {},
    };
  }

  // ──────────────────────────────────────────────
  // GET /me/permissions
  // ──────────────────────────────────────────────
  @Get('me/permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener permisos del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de permisos del usuario.',
    type: PermissionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getPermissions(@Req() req: AuthenticatedRequest) {
    const permissions = await this.authService.getUserPermissions(req.user.id);

    return {
      data: permissions,
      meta: {},
    };
  }
}
