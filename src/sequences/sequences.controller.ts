import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { SequencesService } from './sequences.service';
import { PaginationQueryDto, UpdateSequenceDto } from './dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string | null;
    username: string | null;
  };
}

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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sequencesService.updateSequence(id, dto, {
      userId: req.user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
