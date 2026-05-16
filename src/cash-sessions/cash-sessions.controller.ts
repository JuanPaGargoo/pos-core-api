import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CashSessionsService } from './cash-sessions.service';
import {
  CashMovementDto,
  CloseSessionDto,
  OpenSessionDto,
  PaginationQueryDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('Cajas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private readonly cashSessionsService: CashSessionsService) {}

  @Get()
  @RequirePermission('cash-sessions.read')
  @ApiOperation({ summary: 'Listar cortes de caja' })
  @ApiResponse({ status: 200, description: 'Lista paginada de cajas' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.cashSessionsService.getCashSessions(query);
  }

  @Get('current')
  @RequirePermission('cash-sessions.read')
  @ApiOperation({
    summary: 'Obtener la caja abierta del usuario en una sucursal',
  })
  @ApiQuery({ name: 'branchId', required: true })
  @ApiResponse({ status: 200, description: 'Caja abierta o null' })
  getCurrent(
    @Query('branchId') branchId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const id = Number(branchId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('branchId inválido');
    }
    return this.cashSessionsService.getCurrent(id, req.user.id);
  }

  @Post('open')
  @RequirePermission('cash-sessions.open')
  @Audit('CREATE', 'CashSession')
  @ApiOperation({ summary: 'Abrir caja' })
  @ApiResponse({ status: 201, description: 'Caja abierta' })
  @ApiResponse({ status: 409, description: 'Ya hay una caja abierta' })
  open(@Body() dto: OpenSessionDto, @Req() req: AuthenticatedRequest) {
    return this.cashSessionsService.openSession(dto, req.user.id);
  }

  @Post(':id/close')
  @RequirePermission('cash-sessions.close')
  @Audit('STATUS_CHANGE', 'CashSession')
  @ApiOperation({ summary: 'Cerrar caja y generar el corte' })
  @ApiResponse({
    status: 201,
    description: 'Caja cerrada con el reporte de corte',
  })
  @ApiResponse({ status: 409, description: 'La caja ya está cerrada' })
  close(@Param('id', ParseIntPipe) id: number, @Body() dto: CloseSessionDto) {
    return this.cashSessionsService.closeSession(id, dto);
  }

  @Post(':id/movements')
  @RequirePermission('cash-sessions.open')
  @Audit('CREATE', 'CashMovement')
  @ApiOperation({ summary: 'Registrar entrada o salida de efectivo' })
  @ApiResponse({ status: 201, description: 'Movimiento registrado' })
  addMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CashMovementDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cashSessionsService.addMovement(id, dto, req.user.id);
  }

  @Get(':id/report')
  @RequirePermission('cash-sessions.read')
  @ApiOperation({ summary: 'Obtener el corte de una caja' })
  @ApiResponse({ status: 200, description: 'Reporte de corte de caja' })
  getReport(@Param('id', ParseIntPipe) id: number) {
    return this.cashSessionsService.getReport(id);
  }
}
