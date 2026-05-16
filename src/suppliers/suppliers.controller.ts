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
import { SuppliersService } from './suppliers.service';
import {
  ChangeSupplierStatusDto,
  CreateSupplierDto,
  PaginationQueryDto,
  UpdateSupplierDto,
} from './dto';

@ApiTags('Proveedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission('suppliers.read')
  @ApiOperation({ summary: 'Listar proveedores con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de proveedores' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.suppliersService.getSuppliers(query);
  }

  @Post()
  @RequirePermission('suppliers.create')
  @Audit('CREATE', 'Supplier')
  @ApiOperation({ summary: 'Crear un nuevo proveedor' })
  @ApiResponse({ status: 201, description: 'Proveedor creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.createSupplier(dto);
  }

  @Put(':id')
  @RequirePermission('suppliers.update')
  @Audit('UPDATE', 'Supplier')
  @ApiOperation({ summary: 'Actualizar un proveedor' })
  @ApiResponse({
    status: 200,
    description: 'Proveedor actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.updateSupplier(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('suppliers.update')
  @Audit('STATUS_CHANGE', 'Supplier')
  @ApiOperation({ summary: 'Activar o desactivar un proveedor' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeSupplierStatusDto,
  ) {
    return this.suppliersService.changeStatus(id, dto);
  }
}
