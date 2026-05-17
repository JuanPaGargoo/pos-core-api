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
import { DoctorsService } from './doctors.service';
import {
  ChangeDoctorStatusDto,
  CreateDoctorDto,
  PaginationQueryDto,
  UpdateDoctorDto,
} from './dto';

@ApiTags('Farmacia · Médicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @RequirePermission('doctors.read')
  @ApiOperation({ summary: 'Listar médicos' })
  @ApiResponse({ status: 200, description: 'Lista paginada de médicos' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.doctorsService.getDoctors(query);
  }

  @Post()
  @RequirePermission('doctors.create')
  @Audit('CREATE', 'Doctor')
  @ApiOperation({ summary: 'Registrar un médico' })
  @ApiResponse({ status: 201, description: 'Médico registrado' })
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(dto);
  }

  @Put(':id')
  @RequirePermission('doctors.update')
  @Audit('UPDATE', 'Doctor')
  @ApiOperation({ summary: 'Actualizar un médico' })
  @ApiResponse({ status: 200, description: 'Médico actualizado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.updateDoctor(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('doctors.update')
  @Audit('STATUS_CHANGE', 'Doctor')
  @ApiOperation({ summary: 'Activar o desactivar un médico' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeDoctorStatusDto,
  ) {
    return this.doctorsService.changeStatus(id, dto);
  }
}
