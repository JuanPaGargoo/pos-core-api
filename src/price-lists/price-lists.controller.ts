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
import { PriceListsService } from './price-lists.service';
import {
  ChangePriceListStatusDto,
  CreatePriceListDto,
  PaginationQueryDto,
  UpdatePriceListDto,
} from './dto';

@ApiTags('Listas de Precios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  @RequirePermission('price-lists.read')
  @ApiOperation({ summary: 'Listar listas de precios con paginación' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de listas de precios',
  })
  getAll(@Query() query: PaginationQueryDto) {
    return this.priceListsService.getPriceLists(query);
  }

  @Post()
  @RequirePermission('price-lists.create')
  @Audit('CREATE', 'PriceList')
  @ApiOperation({ summary: 'Crear una nueva lista de precios' })
  @ApiResponse({
    status: 201,
    description: 'Lista de precios creada exitosamente',
  })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  create(@Body() dto: CreatePriceListDto) {
    return this.priceListsService.createPriceList(dto);
  }

  @Put(':id')
  @RequirePermission('price-lists.update')
  @Audit('UPDATE', 'PriceList')
  @ApiOperation({ summary: 'Actualizar una lista de precios' })
  @ApiResponse({
    status: 200,
    description: 'Lista de precios actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Lista de precios no encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.priceListsService.updatePriceList(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('price-lists.update')
  @Audit('STATUS_CHANGE', 'PriceList')
  @ApiOperation({ summary: 'Activar o desactivar una lista de precios' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Lista de precios no encontrada' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePriceListStatusDto,
  ) {
    return this.priceListsService.changeStatus(id, dto);
  }
}
