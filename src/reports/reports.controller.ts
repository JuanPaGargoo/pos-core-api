import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto';

@ApiTags('Reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-summary')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Resumen de ventas por periodo' })
  @ApiResponse({ status: 200, description: 'Totales y desglose por método' })
  salesSummary(@Query() query: ReportQueryDto) {
    return this.reportsService.salesSummary(query);
  }

  @Get('top-products')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Productos más vendidos' })
  @ApiResponse({ status: 200, description: 'Ranking de productos' })
  topProducts(@Query() query: ReportQueryDto) {
    return this.reportsService.topProducts(query);
  }

  @Get('inventory-valuation')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Valuación del inventario al costo' })
  @ApiResponse({ status: 200, description: 'Unidades y valor total' })
  inventoryValuation(@Query() query: ReportQueryDto) {
    return this.reportsService.inventoryValuation(query);
  }

  @Get('low-stock')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Productos en o bajo el punto de reorden' })
  @ApiResponse({ status: 200, description: 'Lista de stock bajo' })
  lowStock(@Query() query: ReportQueryDto) {
    return this.reportsService.lowStock(query);
  }

  @Get('negative-stock')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Existencias negativas a reconciliar' })
  @ApiResponse({ status: 200, description: 'Lista de stock negativo' })
  negativeStock(@Query() query: ReportQueryDto) {
    return this.reportsService.negativeStock(query);
  }

  @Get('credit')
  @RequirePermission('reports.read')
  @ApiOperation({ summary: 'Cuentas por cobrar (crédito de clientes)' })
  @ApiResponse({ status: 200, description: 'Saldos de crédito' })
  credit() {
    return this.reportsService.creditReport();
  }
}
