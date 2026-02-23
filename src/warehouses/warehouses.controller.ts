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
import { WarehousesService } from './warehouses.service';
import {
  CreateWarehouseDto,
  PaginationQueryDto,
  UpdateWarehouseDto,
} from './dto';

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
  @Audit('CREATE', 'Warehouse')
  @ApiOperation({ summary: 'Crear un nuevo almacén asociado a una sucursal' })
  @ApiResponse({ status: 201, description: 'Almacén creado exitosamente' })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Código de almacén ya en uso en esta sucursal',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.warehousesService.createWarehouse(dto);
  }

  // ──────────────────────────────────────────────
  // PUT /warehouses/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('warehouses.update')
  @Audit('UPDATE', 'Warehouse')
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
  ) {
    return this.warehousesService.updateWarehouse(id, dto);
  }
}
