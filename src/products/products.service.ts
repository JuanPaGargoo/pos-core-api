import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeProductStatusDto,
  CreateProductDto,
  PaginationQueryDto,
  ProductBarcodeDto,
  ProductPriceInputDto,
  SetProductPricesDto,
  UpdateProductDto,
} from './dto';

const productInclude = {
  category: { select: { id: true, name: true } },
  unit: {
    select: { id: true, name: true, abbreviation: true, allowsDecimal: true },
  },
  tax: { select: { id: true, name: true, rate: true } },
  barcodes: { orderBy: { isPrimary: 'desc' as const } },
  prices: { include: { priceList: { select: { id: true, name: true } } } },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

/** Coerce a Prisma Decimal (or null) into a plain number for JSON output. */
function dec(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

function mapProduct(p: ProductWithRelations) {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    sellType: p.sellType,
    trackStock: p.trackStock,
    isActive: p.isActive,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    category: p.category,
    unitId: p.unitId,
    unit: p.unit,
    taxId: p.taxId,
    tax: p.tax
      ? { id: p.tax.id, name: p.tax.name, rate: dec(p.tax.rate) }
      : null,
    barcodes: p.barcodes.map((b) => ({
      id: b.id,
      code: b.code,
      isPrimary: b.isPrimary,
      packQuantity: dec(b.packQuantity),
    })),
    prices: p.prices.map((pr) => ({
      id: pr.id,
      priceListId: pr.priceListId,
      priceListName: pr.priceList.name,
      branchId: pr.branchId,
      cost: dec(pr.cost),
      price: dec(pr.price),
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /products ─────────────────────────────────────────
  async getProducts(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcodes: { some: { code: { contains: query.search } } } },
      ];
    }
    if (query.categoryId !== undefined) {
      where.categoryId = query.categoryId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map(mapProduct),
      meta: { page, limit, total },
    };
  }

  // ── GET /products/lookup?code= ────────────────────────────
  async lookup(code: string) {
    const trimmed = (code ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Debe indicar un código a buscar');
    }

    const byBarcode = await this.prisma.product.findFirst({
      where: { barcodes: { some: { code: trimmed } } },
      include: productInclude,
    });
    if (byBarcode) {
      const matched = byBarcode.barcodes.find((b) => b.code === trimmed);
      return {
        data: {
          ...mapProduct(byBarcode),
          matchedBy: 'barcode',
          packQuantity: matched ? dec(matched.packQuantity) : 1,
        },
        meta: {},
      };
    }

    const bySku = await this.prisma.product.findUnique({
      where: { sku: trimmed },
      include: productInclude,
    });
    if (bySku) {
      return {
        data: { ...mapProduct(bySku), matchedBy: 'sku', packQuantity: 1 },
        meta: {},
      };
    }

    throw new NotFoundException(
      `No se encontró un producto con el código "${trimmed}"`,
    );
  }

  // ── GET /products/:id ─────────────────────────────────────
  async getProductById(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    return { data: mapProduct(product), meta: {} };
  }

  // ── POST /products ────────────────────────────────────────
  async createProduct(dto: CreateProductDto) {
    await this.assertSkuAvailable(dto.sku);
    await this.assertUnitExists(dto.unitId);
    if (dto.categoryId != null) await this.assertCategoryExists(dto.categoryId);
    if (dto.taxId != null) await this.assertTaxExists(dto.taxId);

    if (dto.barcodes?.length) {
      this.assertNoDuplicateBarcodeCodes(dto.barcodes);
      await this.assertBarcodesAvailable(dto.barcodes);
    }
    if (dto.prices?.length) {
      this.assertNoDuplicatePriceTargets(dto.prices);
      await this.assertPriceRefsExist(dto.prices);
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sku: dto.sku,
          name: dto.name,
          description: dto.description ?? null,
          categoryId: dto.categoryId ?? null,
          unitId: dto.unitId,
          taxId: dto.taxId ?? null,
          sellType: dto.sellType ?? 'UNIT',
          trackStock: dto.trackStock ?? true,
          isActive: dto.isActive ?? true,
          imageUrl: dto.imageUrl ?? null,
        },
      });

      if (dto.barcodes?.length) {
        await tx.productBarcode.createMany({
          data: dto.barcodes.map((b) => ({
            productId: created.id,
            code: b.code,
            isPrimary: b.isPrimary ?? false,
            packQuantity: b.packQuantity ?? 1,
          })),
        });
      }
      if (dto.prices?.length) {
        await tx.productPrice.createMany({
          data: dto.prices.map((p) => ({
            productId: created.id,
            priceListId: p.priceListId,
            branchId: p.branchId ?? null,
            cost: p.cost ?? 0,
            price: p.price,
          })),
        });
      }

      return tx.product.findUniqueOrThrow({
        where: { id: created.id },
        include: productInclude,
      });
    });

    return { data: mapProduct(product), meta: {} };
  }

  // ── PUT /products/:id ─────────────────────────────────────
  async updateProduct(id: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    if (dto.sku && dto.sku !== product.sku) {
      await this.assertSkuAvailable(dto.sku, id);
    }
    if (dto.unitId != null) await this.assertUnitExists(dto.unitId);
    if (dto.categoryId != null) await this.assertCategoryExists(dto.categoryId);
    if (dto.taxId != null) await this.assertTaxExists(dto.taxId);
    if (dto.barcodes) {
      this.assertNoDuplicateBarcodeCodes(dto.barcodes);
      await this.assertBarcodesAvailable(dto.barcodes, id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.sku !== undefined && { sku: dto.sku }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.unitId !== undefined && { unitId: dto.unitId }),
          ...(dto.taxId !== undefined && { taxId: dto.taxId }),
          ...(dto.sellType !== undefined && { sellType: dto.sellType }),
          ...(dto.trackStock !== undefined && { trackStock: dto.trackStock }),
          ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        },
      });

      if (dto.barcodes) {
        await tx.productBarcode.deleteMany({ where: { productId: id } });
        if (dto.barcodes.length) {
          await tx.productBarcode.createMany({
            data: dto.barcodes.map((b) => ({
              productId: id,
              code: b.code,
              isPrimary: b.isPrimary ?? false,
              packQuantity: b.packQuantity ?? 1,
            })),
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });

    return { data: mapProduct(updated), meta: {} };
  }

  // ── PATCH /products/:id/status ────────────────────────────
  async changeStatus(id: number, dto: ChangeProductStatusDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: productInclude,
    });

    return { data: mapProduct(updated), meta: {} };
  }

  // ── PUT /products/:id/prices ──────────────────────────────
  async setPrices(id: number, dto: SetProductPricesDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Producto con id ${id} no encontrado`);
    }
    this.assertNoDuplicatePriceTargets(dto.prices);
    await this.assertPriceRefsExist(dto.prices);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.productPrice.deleteMany({ where: { productId: id } });
      if (dto.prices.length) {
        await tx.productPrice.createMany({
          data: dto.prices.map((p) => ({
            productId: id,
            priceListId: p.priceListId,
            branchId: p.branchId ?? null,
            cost: p.cost ?? 0,
            price: p.price,
          })),
        });
      }
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
    });

    return { data: mapProduct(updated), meta: {} };
  }

  // ── helpers ───────────────────────────────────────────────
  private async assertSkuAvailable(sku: string, excludeId?: number) {
    const conflict = await this.prisma.product.findFirst({
      where: { sku, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (conflict) {
      throw new ConflictException(`Ya existe un producto con el SKU "${sku}"`);
    }
  }

  private async assertUnitExists(unitId: number) {
    const unit = await this.prisma.unit.findUnique({ where: { id: unitId } });
    if (!unit) {
      throw new BadRequestException(`La unidad con id ${unitId} no existe`);
    }
  }

  private async assertCategoryExists(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new BadRequestException(
        `La categoría con id ${categoryId} no existe`,
      );
    }
  }

  private async assertTaxExists(taxId: number) {
    const tax = await this.prisma.tax.findUnique({ where: { id: taxId } });
    if (!tax) {
      throw new BadRequestException(`El impuesto con id ${taxId} no existe`);
    }
  }

  private assertNoDuplicateBarcodeCodes(barcodes: ProductBarcodeDto[]) {
    const codes = barcodes.map((b) => b.code);
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException(
        'El producto tiene códigos de barras repetidos',
      );
    }
  }

  private async assertBarcodesAvailable(
    barcodes: ProductBarcodeDto[],
    excludeProductId?: number,
  ) {
    const taken = await this.prisma.productBarcode.findMany({
      where: {
        code: { in: barcodes.map((b) => b.code) },
        ...(excludeProductId ? { NOT: { productId: excludeProductId } } : {}),
      },
      select: { code: true },
    });
    if (taken.length > 0) {
      throw new ConflictException(
        `El código de barras "${taken[0].code}" ya está asignado a otro producto`,
      );
    }
  }

  private assertNoDuplicatePriceTargets(prices: ProductPriceInputDto[]) {
    const keys = prices.map((p) => `${p.priceListId}:${p.branchId ?? 'all'}`);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException(
        'Hay precios repetidos para la misma lista y sucursal',
      );
    }
  }

  private async assertPriceRefsExist(prices: ProductPriceInputDto[]) {
    const priceListIds = [...new Set(prices.map((p) => p.priceListId))];
    const foundLists = await this.prisma.priceList.count({
      where: { id: { in: priceListIds } },
    });
    if (foundLists !== priceListIds.length) {
      throw new BadRequestException(
        'Una o más listas de precios indicadas no existen',
      );
    }

    const branchIds = [
      ...new Set(
        prices
          .map((p) => p.branchId)
          .filter((b): b is number => b !== undefined),
      ),
    ];
    if (branchIds.length > 0) {
      const foundBranches = await this.prisma.branch.count({
        where: { id: { in: branchIds } },
      });
      if (foundBranches !== branchIds.length) {
        throw new BadRequestException(
          'Una o más sucursales indicadas no existen',
        );
      }
    }
  }
}
