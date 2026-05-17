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
import { TaxesService } from './taxes.service';
import {
  ChangeTaxStatusDto,
  CreateTaxDto,
  PaginationQueryDto,
  UpdateTaxDto,
} from './dto';

@ApiTags('Impuestos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  @RequirePermission('taxes.read')
  @ApiOperation({ summary: 'Listar impuestos' })
  @ApiResponse({ status: 200, description: 'Lista paginada de impuestos' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.taxesService.getTaxes(query);
  }

  @Post()
  @RequirePermission('taxes.create')
  @Audit('CREATE', 'Tax')
  @ApiOperation({ summary: 'Crear un impuesto' })
  @ApiResponse({ status: 201, description: 'Impuesto creado' })
  create(@Body() dto: CreateTaxDto) {
    return this.taxesService.createTax(dto);
  }

  @Put(':id')
  @RequirePermission('taxes.update')
  @Audit('UPDATE', 'Tax')
  @ApiOperation({ summary: 'Actualizar un impuesto' })
  @ApiResponse({ status: 200, description: 'Impuesto actualizado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTaxDto) {
    return this.taxesService.updateTax(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('taxes.update')
  @Audit('STATUS_CHANGE', 'Tax')
  @ApiOperation({ summary: 'Activar o desactivar un impuesto' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeTaxStatusDto,
  ) {
    return this.taxesService.changeStatus(id, dto);
  }
}
