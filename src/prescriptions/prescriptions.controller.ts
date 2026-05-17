import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PrescriptionsService } from './prescriptions.service';
import {
  ChangePrescriptionStatusDto,
  CreatePrescriptionDto,
  PaginationQueryDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('Farmacia · Recetas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  @RequirePermission('prescriptions.read')
  @ApiOperation({ summary: 'Listar recetas médicas' })
  @ApiResponse({ status: 200, description: 'Lista paginada de recetas' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.prescriptionsService.getPrescriptions(query);
  }

  // Ruta estática — debe ir antes de :id.
  @Get('control-log')
  @RequirePermission('prescriptions.read')
  @ApiOperation({
    summary: 'Libro de control de medicamentos controlados (COFEPRIS)',
  })
  @ApiResponse({ status: 200, description: 'Registro de control' })
  getControlLog(@Query() query: PaginationQueryDto) {
    return this.prescriptionsService.getControlLog(query);
  }

  @Get(':id')
  @RequirePermission('prescriptions.read')
  @ApiOperation({ summary: 'Obtener una receta por su ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la receta' })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.prescriptionsService.getPrescriptionById(id);
  }

  @Post()
  @RequirePermission('prescriptions.create')
  @Audit('CREATE', 'Prescription')
  @ApiOperation({ summary: 'Registrar una receta médica' })
  @ApiResponse({ status: 201, description: 'Receta registrada' })
  create(@Body() dto: CreatePrescriptionDto, @Req() req: AuthenticatedRequest) {
    return this.prescriptionsService.createPrescription(dto, req.user.id);
  }

  @Patch(':id/status')
  @RequirePermission('prescriptions.update')
  @Audit('STATUS_CHANGE', 'Prescription')
  @ApiOperation({ summary: 'Cambiar el estado de una receta' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePrescriptionStatusDto,
  ) {
    return this.prescriptionsService.changeStatus(id, dto);
  }
}
