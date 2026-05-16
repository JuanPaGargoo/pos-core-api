import {
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SalesService } from './sales.service';
import {
  AddLayawayPaymentDto,
  CreateSaleDto,
  PaginationQueryDto,
  SyncSalesDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @RequirePermission('sales.read')
  @ApiOperation({ summary: 'Listar ventas con filtros' })
  @ApiResponse({ status: 200, description: 'Lista paginada de ventas' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.salesService.getSales(query);
  }

  @Get(':id')
  @RequirePermission('sales.read')
  @ApiOperation({ summary: 'Obtener una venta por su ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la venta' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.getSaleById(id);
  }

  @Post()
  @RequirePermission('sales.create')
  @Audit('CREATE', 'Sale')
  @ApiOperation({ summary: 'Registrar una venta' })
  @ApiResponse({ status: 201, description: 'Venta registrada' })
  @ApiResponse({ status: 400, description: 'Datos de venta inválidos' })
  create(@Body() dto: CreateSaleDto, @Req() req: AuthenticatedRequest) {
    return this.salesService.createSale(dto, req.user.id);
  }

  @Post('sync')
  @RequirePermission('pos.sync')
  @Audit('CREATE', 'Sale')
  @ApiOperation({ summary: 'Sincronizar un lote de ventas offline' })
  @ApiResponse({
    status: 201,
    description: 'Resultado por venta (synced | duplicate | failed)',
  })
  sync(@Body() dto: SyncSalesDto, @Req() req: AuthenticatedRequest) {
    return this.salesService.syncSales(dto, req.user.id);
  }

  @Post('layaway')
  @RequirePermission('sales.create')
  @Audit('CREATE', 'Sale')
  @ApiOperation({ summary: 'Registrar un apartado (layaway)' })
  @ApiResponse({ status: 201, description: 'Apartado registrado' })
  createLayaway(@Body() dto: CreateSaleDto, @Req() req: AuthenticatedRequest) {
    return this.salesService.createLayaway(dto, req.user.id);
  }

  @Post(':id/layaway-payment')
  @RequirePermission('sales.create')
  @Audit('UPDATE', 'Sale')
  @ApiOperation({ summary: 'Registrar un abono a un apartado' })
  @ApiResponse({ status: 201, description: 'Abono registrado' })
  @ApiResponse({
    status: 409,
    description: 'La venta no es un apartado activo',
  })
  layawayPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLayawayPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.salesService.addLayawayPayment(id, dto, req.user.id);
  }

  @Post(':id/cancel')
  @RequirePermission('sales.cancel')
  @Audit('STATUS_CHANGE', 'Sale')
  @ApiOperation({ summary: 'Cancelar una venta y reingresar el stock' })
  @ApiResponse({ status: 201, description: 'Venta cancelada' })
  @ApiResponse({ status: 409, description: 'La venta no se puede cancelar' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.salesService.cancelSale(id, req.user.id);
  }
}
