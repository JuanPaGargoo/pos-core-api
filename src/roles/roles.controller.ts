import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
import { RolesService } from './roles.service';
import {
  AssignPermissionsDto,
  CreateRoleDto,
  PaginationQueryDto,
  UpdateRoleDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

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
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  async createRole(
    @Body() dto: CreateRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const role = await this.rolesService.createRole(dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { data: role, meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /roles/:id
  // ──────────────────────────────────────────────
  @Put('roles/:id')
  @RequirePermission('roles.update')
  @ApiOperation({ summary: 'Actualizar un rol' })
  @ApiResponse({ status: 200, description: 'Rol actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const role = await this.rolesService.updateRole(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { data: role, meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /roles/:id/permissions
  // ──────────────────────────────────────────────
  @Put('roles/:id/permissions')
  @RequirePermission('roles.assign_permissions')
  @ApiOperation({
    summary: 'Asignar permisos a un rol (reemplaza los actuales)',
  })
  @ApiResponse({ status: 200, description: 'Permisos asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Rol o permisos no encontrados' })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.rolesService.assignPermissions(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return { data: result, meta: {} };
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
