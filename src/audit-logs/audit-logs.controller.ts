import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // ──────────────────────────────────────────────
  // GET /audit-logs
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('audit-logs.read')
  @ApiOperation({
    summary:
      'Listar audit logs con paginación y filtros (userId, branchId, action, entity, from, to)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de audit logs' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.getLogs(query);
  }

  // ──────────────────────────────────────────────
  // GET /audit-logs/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @RequirePermission('audit-logs.read')
  @ApiOperation({ summary: 'Obtener detalle de un audit log por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del audit log' })
  @ApiResponse({ status: 404, description: 'AuditLog no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.auditLogsService.getLogById(id);
  }
}
