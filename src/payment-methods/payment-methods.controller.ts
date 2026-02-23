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
import { PaymentMethodsService } from './payment-methods.service';
import {
  ChangePaymentMethodStatusDto,
  CreatePaymentMethodDto,
  PaginationQueryDto,
  UpdatePaymentMethodDto,
} from './dto';

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
  @Audit('CREATE', 'PaymentMethod')
  @ApiOperation({ summary: 'Crear un nuevo método de pago' })
  @ApiResponse({
    status: 201,
    description: 'Método de pago creado exitosamente',
  })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.createPaymentMethod(dto);
  }

  // ──────────────────────────────────────────────
  // PUT /payment-methods/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('payment-methods.update')
  @Audit('UPDATE', 'PaymentMethod')
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
  ) {
    return this.paymentMethodsService.updatePaymentMethod(id, dto);
  }

  // ──────────────────────────────────────────────
  // PATCH /payment-methods/:id/status
  // ──────────────────────────────────────────────
  @Patch(':id/status')
  @RequirePermission('payment-methods.update')
  @Audit('STATUS_CHANGE', 'PaymentMethod')
  @ApiOperation({ summary: 'Activar o desactivar un método de pago' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Método de pago no encontrado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePaymentMethodStatusDto,
  ) {
    return this.paymentMethodsService.changeStatus(id, dto);
  }
}
