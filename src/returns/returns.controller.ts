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
import { ReturnsService } from './returns.service';
import { CreateReturnDto, PaginationQueryDto } from './dto';

interface AuthenticatedRequest extends Request {
  user: { id: number };
}

@ApiTags('Devoluciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @RequirePermission('returns.read')
  @ApiOperation({ summary: 'Listar devoluciones' })
  @ApiResponse({ status: 200, description: 'Lista paginada de devoluciones' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.returnsService.getReturns(query);
  }

  @Get(':id')
  @RequirePermission('returns.read')
  @ApiOperation({ summary: 'Obtener una devolución por su ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la devolución' })
  @ApiResponse({ status: 404, description: 'Devolución no encontrada' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.getReturnById(id);
  }

  @Post()
  @RequirePermission('returns.create')
  @Audit('CREATE', 'SaleReturn')
  @ApiOperation({ summary: 'Registrar una devolución / nota de crédito' })
  @ApiResponse({ status: 201, description: 'Devolución registrada' })
  @ApiResponse({ status: 400, description: 'Datos de devolución inválidos' })
  create(@Body() dto: CreateReturnDto, @Req() req: AuthenticatedRequest) {
    return this.returnsService.createReturn(dto, req.user.id);
  }
}
