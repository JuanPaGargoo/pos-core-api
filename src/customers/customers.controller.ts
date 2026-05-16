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
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CustomersService } from './customers.service';
import {
  ChangeCustomerStatusDto,
  CreateCustomerDto,
  PaginationQueryDto,
  RegisterPaymentDto,
  UpdateCustomerDto,
} from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission('customers.read')
  @ApiOperation({ summary: 'Listar clientes con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de clientes' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.customersService.getCustomers(query);
  }

  @Get(':id')
  @RequirePermission('customers.read')
  @ApiOperation({ summary: 'Obtener un cliente por su ID' })
  @ApiResponse({ status: 200, description: 'Detalle del cliente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getCustomerById(id);
  }

  @Get(':id/credit')
  @RequirePermission('customers.read')
  @ApiOperation({ summary: 'Estado de cuenta de crédito del cliente' })
  @ApiResponse({ status: 200, description: 'Saldo y movimientos de crédito' })
  getCredit(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.getCredit(id);
  }

  @Post()
  @RequirePermission('customers.create')
  @Audit('CREATE', 'Customer')
  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado exitosamente' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.createCustomer(dto);
  }

  @Put(':id')
  @RequirePermission('customers.update')
  @Audit('UPDATE', 'Customer')
  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiResponse({ status: 200, description: 'Cliente actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.updateCustomer(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('customers.update')
  @Audit('STATUS_CHANGE', 'Customer')
  @ApiOperation({ summary: 'Activar o desactivar un cliente' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCustomerStatusDto,
  ) {
    return this.customersService.changeStatus(id, dto);
  }

  @Post(':id/payments')
  @RequirePermission('customers.credit')
  @Audit('CREATE', 'CustomerCreditEntry')
  @ApiOperation({ summary: 'Registrar un abono a la cuenta del cliente' })
  @ApiResponse({ status: 201, description: 'Abono registrado' })
  @ApiResponse({ status: 400, description: 'El abono supera el saldo' })
  registerPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegisterPaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.customersService.registerPayment(id, dto, req.user.id);
  }
}
