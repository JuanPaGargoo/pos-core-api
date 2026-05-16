import {
  Body,
  Controller,
  Get,
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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { InventoryService } from './inventory.service';
import {
  AdjustStockDto,
  MovementsQueryDto,
  SetReorderPointDto,
  StockQueryDto,
  TransferStockDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user?: { id: number };
}

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stock')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Listar existencias por producto y almacén' })
  @ApiResponse({ status: 200, description: 'Lista paginada de existencias' })
  getStock(@Query() query: StockQueryDto) {
    return this.inventoryService.getStock(query);
  }

  @Get('movements')
  @RequirePermission('inventory.read')
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  @ApiResponse({ status: 200, description: 'Lista paginada de movimientos' })
  getMovements(@Query() query: MovementsQueryDto) {
    return this.inventoryService.getMovements(query);
  }

  @Post('adjustments')
  @RequirePermission('inventory.adjust')
  @Audit('ADJUSTMENT', 'StockMovement')
  @ApiOperation({
    summary: 'Ajustar la existencia de un producto (conteo físico)',
  })
  @ApiResponse({ status: 201, description: 'Ajuste registrado' })
  adjust(@Body() dto: AdjustStockDto, @Req() req: AuthenticatedRequest) {
    return this.inventoryService.adjustStock(dto, req.user?.id);
  }

  @Post('transfers')
  @RequirePermission('inventory.adjust')
  @Audit('TRANSFER', 'StockMovement')
  @ApiOperation({ summary: 'Traspasar existencias entre almacenes' })
  @ApiResponse({ status: 201, description: 'Traspaso registrado' })
  transfer(@Body() dto: TransferStockDto, @Req() req: AuthenticatedRequest) {
    return this.inventoryService.transferStock(dto, req.user?.id);
  }

  @Put('reorder-point')
  @RequirePermission('inventory.adjust')
  @Audit('UPDATE', 'StockLevel')
  @ApiOperation({ summary: 'Definir el punto de reorden de un producto' })
  @ApiResponse({ status: 200, description: 'Punto de reorden actualizado' })
  setReorderPoint(@Body() dto: SetReorderPointDto) {
    return this.inventoryService.setReorderPoint(dto);
  }
}
