import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { SequencesService } from './sequences.service';
import { PaginationQueryDto, UpdateSequenceDto } from './dto';

@ApiTags('Secuencias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sequences')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  // ──────────────────────────────────────────────
  // GET /sequences
  // ──────────────────────────────────────────────
  @Get()
  @RequirePermission('sequences.read')
  @ApiOperation({ summary: 'Listar secuencias (filtrar por branchId)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de secuencias' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.sequencesService.getSequences(query);
  }

  // ──────────────────────────────────────────────
  // PUT /sequences/:id
  // ──────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('sequences.update')
  @Audit('UPDATE', 'Sequence')
  @ApiOperation({
    summary:
      'Actualizar configuración de una secuencia (prefix, nextNumber, padding)',
  })
  @ApiResponse({
    status: 200,
    description: 'Secuencia actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Secuencia no encontrada' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSequenceDto,
  ) {
    return this.sequencesService.updateSequence(id, dto);
  }
}
