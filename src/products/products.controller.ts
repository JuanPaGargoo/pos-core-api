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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ProductsService } from './products.service';
import {
  ChangeProductStatusDto,
  CreateProductDto,
  PaginationQueryDto,
  SetProductPricesDto,
  UpdateProductDto,
} from './dto';

@ApiTags('Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission('products.read')
  @ApiOperation({ summary: 'Listar productos con paginación y búsqueda' })
  @ApiResponse({ status: 200, description: 'Lista paginada de productos' })
  getAll(@Query() query: PaginationQueryDto) {
    return this.productsService.getProducts(query);
  }

  // Debe declararse antes de `:id` para que no lo capture la ruta param.
  @Get('lookup')
  @RequirePermission('products.read')
  @ApiOperation({ summary: 'Resolver un producto por código de barras o SKU' })
  @ApiQuery({ name: 'code', description: 'Código de barras o SKU' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  lookup(@Query('code') code: string) {
    return this.productsService.lookup(code);
  }

  @Get(':id')
  @RequirePermission('products.read')
  @ApiOperation({ summary: 'Obtener un producto por su ID' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.getProductById(id);
  }

  @Post()
  @RequirePermission('products.create')
  @Audit('CREATE', 'Product')
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 409, description: 'SKU o código de barras ya en uso' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Put(':id')
  @RequirePermission('products.update')
  @Audit('UPDATE', 'Product')
  @ApiOperation({ summary: 'Actualizar un producto' })
  @ApiResponse({
    status: 200,
    description: 'Producto actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  @ApiResponse({ status: 409, description: 'SKU o código de barras ya en uso' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  @Put(':id/prices')
  @RequirePermission('products.update')
  @Audit('UPDATE', 'Product')
  @ApiOperation({ summary: 'Reemplazar los precios de un producto' })
  @ApiResponse({
    status: 200,
    description: 'Precios actualizados exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  setPrices(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetProductPricesDto,
  ) {
    return this.productsService.setPrices(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('products.update')
  @Audit('STATUS_CHANGE', 'Product')
  @ApiOperation({ summary: 'Activar o desactivar un producto' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  changeStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeProductStatusDto,
  ) {
    return this.productsService.changeStatus(id, dto);
  }
}
