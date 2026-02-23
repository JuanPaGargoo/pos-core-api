import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { UsersService } from './users.service';
import {
  AssignBranchesDto,
  AssignRolesDto,
  ChangeStatusDto,
  CreateUserDto,
  PaginationQueryDto,
  UpdateUserDto,
} from './dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ──────────────────────────────────────────────
  // GET /users
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Listar usuarios con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuarios' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  async getUsers(@Query() query: PaginationQueryDto) {
    return this.usersService.getUsers(query);
  }

  // ──────────────────────────────────────────────
  // POST /users
  // ──────────────────────────────────────────────
  @Post()
  @RequirePermission('users.create')
  @Audit('CREATE', 'User')
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Username o email ya en uso' })
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.usersService.createUser(dto);
    return { data: user, meta: {} };
  }

  // ──────────────────────────────────────────────
  // GET /users/:id
  // ──────────────────────────────────────────────
  @Get(':id')
  @RequirePermission('users.read')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Datos del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.getUserById(id);
    return { data: user, meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /users/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('users.update')
  @Audit('UPDATE', 'User')
  @ApiOperation({ summary: 'Actualizar datos de un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'Username o email ya en uso' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, dto);
    return { data: user, meta: {} };
  }

  // ──────────────────────────────────────────────
  // PATCH /users/:id/status
  // ──────────────────────────────────────────────
  @Patch(':id/status')
  @RequirePermission('users.change_status')
  @Audit('STATUS_CHANGE', 'User')
  @ApiOperation({ summary: 'Activar o desactivar un usuario (soft delete)' })
  @ApiResponse({ status: 200, description: 'Estado del usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
  ) {
    const user = await this.usersService.changeStatus(id, dto);
    return { data: user, meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /users/:id/roles
  // ──────────────────────────────────────────────
  @Put(':id/roles')
  @RequirePermission('users.assign_roles')
  @Audit('PERMISSION_CHANGE', 'User')
  @ApiOperation({
    summary: 'Asignar roles a un usuario (reemplaza los actuales)',
  })
  @ApiResponse({ status: 200, description: 'Roles asignados exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario o roles no encontrados' })
  async assignRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
  ) {
    const user = await this.usersService.assignRoles(id, dto);
    return { data: user, meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /users/:id/branches
  // ──────────────────────────────────────────────
  @Put(':id/branches')
  @RequirePermission('users.assign_branches')
  @Audit('UPDATE', 'User')
  @ApiOperation({
    summary: 'Asignar sucursales a un usuario (reemplaza las actuales)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sucursales asignadas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario o sucursales no encontrados',
  })
  async assignBranches(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignBranchesDto,
  ) {
    const user = await this.usersService.assignBranches(id, dto);
    return { data: user, meta: {} };
  }
}
