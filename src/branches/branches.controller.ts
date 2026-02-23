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
import { BranchesService } from './branches.service';
import { CreateBranchDto, PaginationQueryDto, UpdateBranchDto } from './dto';

@ApiTags('Sucursales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  // ──────────────────────────────────────────────
  // GET /branches
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('branches.read')
  @ApiOperation({ summary: 'Listar sucursales con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de sucursales' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.branchesService.getBranches(query);
  }

  // ──────────────────────────────────────────────
  // POST /branches
  // ──────────────────────────────────────────────
  @Post()
  @RequirePermission('branches.create')
  @Audit('CREATE', 'Branch')
  @ApiOperation({ summary: 'Crear una nueva sucursal' })
  @ApiResponse({ status: 201, description: 'Sucursal creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Código de sucursal ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.createBranch(dto);
  }

  // ──────────────────────────────────────────────
  // PUT /branches/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('branches.update')
  @Audit('UPDATE', 'Branch')
  @ApiOperation({ summary: 'Actualizar una sucursal existente' })
  @ApiResponse({
    status: 200,
    description: 'Sucursal actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiResponse({ status: 409, description: 'Código de sucursal ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBranchDto) {
    return this.branchesService.updateBranch(id, dto);
  }
}
