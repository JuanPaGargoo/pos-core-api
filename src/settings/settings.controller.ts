import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SettingsService } from './settings.service';
import { QuerySettingsDto, UpsertSettingDto } from './dto';

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
  @Audit('UPDATE', 'Setting')
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
  upsert(@Body() dto: UpsertSettingDto) {
    return this.settingsService.upsertSetting(dto);
  }
}
