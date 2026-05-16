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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto, PaginationQueryDto } from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('Compras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @RequirePermission('purchases.read')
  @ApiOperation({ summary: 'Listar compras con filtros' })
  @ApiResponse({ status: 200, description: 'Lista paginada de compras' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.purchasesService.getPurchases(query);
  }

  @Get(':id')
  @RequirePermission('purchases.read')
  @ApiOperation({ summary: 'Obtener una compra por su ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la compra' })
  @ApiResponse({ status: 404, description: 'Compra no encontrada' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.getPurchaseById(id);
  }

  @Post()
  @RequirePermission('purchases.create')
  @Audit('CREATE', 'Purchase')
  @ApiOperation({ summary: 'Registrar una compra en borrador' })
  @ApiResponse({ status: 201, description: 'Compra creada' })
  create(@Body() dto: CreatePurchaseDto, @Req() req: AuthenticatedRequest) {
    return this.purchasesService.createPurchase(dto, req.user.id);
  }

  @Post(':id/receive')
  @RequirePermission('purchases.receive')
  @Audit('STATUS_CHANGE', 'Purchase')
  @ApiOperation({ summary: 'Recibir una compra e ingresar el stock' })
  @ApiResponse({ status: 201, description: 'Compra recibida' })
  @ApiResponse({ status: 409, description: 'La compra no se puede recibir' })
  receive(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.purchasesService.receivePurchase(id, req.user.id);
  }

  @Post(':id/cancel')
  @RequirePermission('purchases.receive')
  @Audit('STATUS_CHANGE', 'Purchase')
  @ApiOperation({ summary: 'Cancelar una compra en borrador' })
  @ApiResponse({ status: 201, description: 'Compra cancelada' })
  @ApiResponse({ status: 409, description: 'La compra no se puede cancelar' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.cancelPurchase(id);
  }
}
