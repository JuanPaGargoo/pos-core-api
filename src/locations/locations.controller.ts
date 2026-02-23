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
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  PaginationQueryDto,
  UpdateLocationDto,
} from './dto';

@ApiTags('Ubicaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ──────────────────────────────────────────────
  // GET /locations
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('locations.read')
  @ApiOperation({
    summary:
      'Listar ubicaciones con paginación (filtrar por warehouseId y/o parentId)',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de ubicaciones' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.locationsService.getLocations(query);
  }

  // ──────────────────────────────────────────────
  // POST /locations
  // ──────────────────────────────────────────────
  @Post()
  @RequirePermission('locations.create')
  @Audit('CREATE', 'Location')
  @ApiOperation({ summary: 'Crear una nueva ubicación asociada a un almacén' })
  @ApiResponse({ status: 201, description: 'Ubicación creada exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Padre no pertenece al mismo almacén',
  })
  @ApiResponse({
    status: 404,
    description: 'Almacén o ubicación padre no encontrado',
  })
  @ApiResponse({ status: 409, description: 'Código de ubicación ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  create(@Body() dto: CreateLocationDto) {
    return this.locationsService.createLocation(dto);
  }

  // ──────────────────────────────────────────────
  // PUT /locations/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('locations.update')
  @Audit('UPDATE', 'Location')
  @ApiOperation({ summary: 'Actualizar una ubicación existente' })
  @ApiResponse({
    status: 200,
    description: 'Ubicación actualizada exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Auto-referencia o padre de otro almacén',
  })
  @ApiResponse({ status: 404, description: 'Ubicación o padre no encontrado' })
  @ApiResponse({ status: 409, description: 'Código de ubicación ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.updateLocation(id, dto);
  }
}
