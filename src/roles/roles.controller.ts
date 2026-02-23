import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesService } from './roles.service';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  PaginationQueryDto,
  UpdateRoleDto,
} from './dto';

@ApiTags('Roles y Permisos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // ──────────────────────────────────────────────
  // GET /roles
  // ──────────────────────────────────────────────
  @Get('roles')
  @RequirePermission('roles.read')
  @ApiOperation({ summary: 'Listar roles con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de roles' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  async getRoles(@Query() query: PaginationQueryDto) {
    return this.rolesService.getRoles(query);
  }

  // ──────────────────────────────────────────────
  // POST /roles
  // ──────────────────────────────────────────────
  @Post('roles')
  @RequirePermission('roles.create')
  @Audit('CREATE', 'Role')
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  // ──────────────────────────────────────────────
  // PUT /roles/:id
  // ──────────────────────────────────────────────
  @Put('roles/:id')
  @RequirePermission('roles.update')
  @Audit('UPDATE', 'Role')
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(id, dto);
  }

  // ──────────────────────────────────────────────
  // PUT /roles/:id/permissions
  // ──────────────────────────────────────────────
  @Put('roles/:id/permissions')
  @RequirePermission('roles.assign_permissions')
  @Audit('PERMISSION_CHANGE', 'Role')
  @ApiOperation({
    summary: 'Asignar permisos a un rol (reemplaza los actuales)',
  })
  @ApiResponse({ status: 200, description: 'Permisos asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol o permisos no encontrados' })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, dto);
  }

  // ──────────────────────────────────────────────
  // GET /permissions
  // ──────────────────────────────────────────────
  @Get('permissions')
  @RequirePermission('permissions.read')
  @ApiOperation({ summary: 'Listar todos los permisos disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de permisos' })
  async getPermissions() {
    return this.rolesService.getPermissions();
  }
}
