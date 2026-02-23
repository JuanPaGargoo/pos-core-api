import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { PaymentMethodsService } from './payment-methods.service';
import {
  ChangeStatusDto,
  CreatePaymentMethodDto,
  PaginationQueryDto,
  UpdatePaymentMethodDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

@ApiTags('Métodos de Pago')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  // ──────────────────────────────────────────────
  // GET /payment-methods
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('payment-methods.read')
  @ApiOperation({ summary: 'Listar métodos de pago con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de métodos de pago',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.paymentMethodsService.getPaymentMethods(query);
  }

  // ──────────────────────────────────────────────
  // POST /payment-methods
  // ──────────────────────────────────────────────
  @Post()
  @RequirePermission('payment-methods.create')
  @ApiOperation({ summary: 'Crear un nuevo método de pago' })
  @ApiResponse({
    status: 201,
    description: 'Método de pago creado exitosamente',
  })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  create(
    @Body() dto: CreatePaymentMethodDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentMethodsService.createPaymentMethod(dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ──────────────────────────────────────────────
  // PUT /payment-methods/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('payment-methods.update')
  @ApiOperation({ summary: 'Actualizar un método de pago existente' })
  @ApiResponse({
    status: 200,
    description: 'Método de pago actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentMethodDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentMethodsService.updatePaymentMethod(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ──────────────────────────────────────────────
  // PATCH /payment-methods/:id/status
  // ──────────────────────────────────────────────
  @Patch(':id/status')
  @RequirePermission('payment-methods.update')
  @ApiOperation({ summary: 'Activar o desactivar un método de pago' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentMethodsService.changeStatus(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
