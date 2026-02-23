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
import { WarehousesService } from './warehouses.service';
import {
  CreateWarehouseDto,
  PaginationQueryDto,
  UpdateWarehouseDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

@ApiTags('Almacenes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  // ──────────────────────────────────────────────
  // GET /warehouses
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('warehouses.read')
  @ApiOperation({
    summary: 'Listar almacenes con paginación (filtrar por branchId)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de almacenes' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.warehousesService.getWarehouses(query);
  }

  // ──────────────────────────────────────────────
  // POST /warehouses
  // ──────────────────────────────────────────────
  @Post()
  @RequirePermission('warehouses.create')
  @ApiOperation({ summary: 'Crear un nuevo almacén asociado a una sucursal' })
  @ApiResponse({ status: 201, description: 'Almacén creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Código de almacén ya en uso en esta sucursal',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  create(@Body() dto: CreateWarehouseDto, @Req() req: AuthenticatedRequest) {
    return this.warehousesService.createWarehouse(dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ──────────────────────────────────────────────
  // PUT /warehouses/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('warehouses.update')
  @ApiOperation({ summary: 'Actualizar un almacén existente' })
  @ApiResponse({ status: 200, description: 'Almacén actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Almacén no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Código de almacén ya en uso en esta sucursal',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.warehousesService.updateWarehouse(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
