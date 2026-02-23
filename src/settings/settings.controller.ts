import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { SettingsService } from './settings.service';
import { QuerySettingsDto, UpsertSettingDto } from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ──────────────────────────────────────────────
  // GET /settings
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('settings.read')
  @ApiOperation({
    summary:
      'Obtener settings. Con branchId aplica fallback: branch sobreescribe global.',
  })
  @ApiResponse({ status: 200, description: 'Lista de settings efectivos' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: QuerySettingsDto) {
    return this.settingsService.getSettings(query);
  }

  // ──────────────────────────────────────────────
  // PUT /settings
  // ──────────────────────────────────────────────
  @Put()
  @RequirePermission('settings.update')
  @ApiOperation({
    summary:
      'Crear o actualizar un setting (upsert). Identifica por scope + branchId + key.',
  })
  @ApiResponse({ status: 200, description: 'Setting guardado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'branchId requerido/prohibido según scope',
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  upsert(@Body() dto: UpsertSettingDto, @Req() req: AuthenticatedRequest) {
    return this.settingsService.upsertSetting(dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
