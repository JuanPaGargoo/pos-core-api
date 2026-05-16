import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PosSyncService } from './pos-sync.service';
import { BootstrapQueryDto, DeltaQueryDto } from './dto';

@ApiTags('POS Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos-sync')
export class PosSyncController {
  constructor(private readonly posSyncService: PosSyncService) {}

  @Get('bootstrap')
  @RequirePermission('pos.sync')
  @ApiOperation({ summary: 'Snapshot completo del catálogo para la caja' })
  @ApiResponse({ status: 200, description: 'Snapshot completo' })
  bootstrap(@Query() query: BootstrapQueryDto) {
    return this.posSyncService.bootstrap(query.branchId);
  }

  @Get('delta')
  @RequirePermission('pos.sync')
  @ApiOperation({ summary: 'Cambios del catálogo desde una fecha' })
  @ApiResponse({ status: 200, description: 'Snapshot incremental' })
  delta(@Query() query: DeltaQueryDto) {
    return this.posSyncService.delta(query.branchId, query.since);
  }
}
