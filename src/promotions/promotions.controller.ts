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
import { PromotionsService } from './promotions.service';
import {
  ChangePromotionStatusDto,
  CreatePromotionDto,
  PaginationQueryDto,
  UpdatePromotionDto,
} from './dto';

@ApiTags('Promociones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @RequirePermission('promotions.read')
  @ApiOperation({ summary: 'Listar promociones con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de promociones' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.promotionsService.getPromotions(query);
  }

  // Debe ir antes de `:id`.
  @Get('active')
  @RequirePermission('promotions.read')
  @ApiOperation({ summary: 'Promociones vigentes (para el punto de venta)' })
  @ApiResponse({ status: 200, description: 'Promociones activas y vigentes' })
  getActive() {
    return this.promotionsService.getActive();
  }

  @Post()
  @RequirePermission('promotions.create')
  @Audit('CREATE', 'Promotion')
  @ApiOperation({ summary: 'Crear una promoción' })
  @ApiResponse({ status: 201, description: 'Promoción creada' })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.createPromotion(dto);
  }

  @Put(':id')
  @RequirePermission('promotions.update')
  @Audit('UPDATE', 'Promotion')
  @ApiOperation({ summary: 'Actualizar una promoción' })
  @ApiResponse({ status: 200, description: 'Promoción actualizada' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.updatePromotion(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('promotions.update')
  @Audit('STATUS_CHANGE', 'Promotion')
  @ApiOperation({ summary: 'Activar o desactivar una promoción' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Promoción no encontrada' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangePromotionStatusDto,
  ) {
    return this.promotionsService.changeStatus(id, dto);
  }
}
