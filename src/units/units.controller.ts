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
import { UnitsService } from './units.service';
import { CreateUnitDto, PaginationQueryDto, UpdateUnitDto } from './dto';

@ApiTags('Unidades de Medida')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @RequirePermission('units.read')
  @ApiOperation({ summary: 'Listar unidades de medida con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de unidades' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.unitsService.getUnits(query);
  }

  @Post()
  @RequirePermission('units.create')
  @Audit('CREATE', 'Unit')
  @ApiOperation({ summary: 'Crear una nueva unidad de medida' })
  @ApiResponse({ status: 201, description: 'Unidad creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.createUnit(dto);
  }

  @Put(':id')
  @RequirePermission('units.update')
  @Audit('UPDATE', 'Unit')
  @ApiOperation({ summary: 'Actualizar una unidad de medida' })
  @ApiResponse({ status: 200, description: 'Unidad actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Unidad no encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUnitDto) {
    return this.unitsService.updateUnit(id, dto);
  }
}
