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
import { LocationsService } from './locations.service';
import {
  CreateLocationDto,
  PaginationQueryDto,
  UpdateLocationDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

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
  create(@Body() dto: CreateLocationDto, @Req() req: AuthenticatedRequest) {
    return this.locationsService.createLocation(dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ──────────────────────────────────────────────
  // PUT /locations/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('locations.update')
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.locationsService.updateLocation(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
