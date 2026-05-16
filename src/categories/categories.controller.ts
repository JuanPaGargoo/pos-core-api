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
import { CategoriesService } from './categories.service';
import {
  ChangeCategoryStatusDto,
  CreateCategoryDto,
  PaginationQueryDto,
  UpdateCategoryDto,
} from './dto';

@ApiTags('Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermission('categories.read')
  @ApiOperation({ summary: 'Listar categorías con paginación' })
  @ApiResponse({ status: 200, description: 'Lista paginada de categorías' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.categoriesService.getCategories(query);
  }

  @Post()
  @RequirePermission('categories.create')
  @Audit('CREATE', 'Category')
  @ApiOperation({ summary: 'Crear una nueva categoría' })
  @ApiResponse({ status: 201, description: 'Categoría creada exitosamente' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(dto);
  }

  @Put(':id')
  @RequirePermission('categories.update')
  @Audit('UPDATE', 'Category')
  @ApiOperation({ summary: 'Actualizar una categoría' })
  @ApiResponse({
    status: 200,
    description: 'Categoría actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  @ApiResponse({ status: 409, description: 'Nombre ya en uso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('categories.update')
  @Audit('STATUS_CHANGE', 'Category')
  @ApiOperation({ summary: 'Activar o desactivar una categoría' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Categoría no encontrada' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeCategoryStatusDto,
  ) {
    return this.categoriesService.changeStatus(id, dto);
  }
}
