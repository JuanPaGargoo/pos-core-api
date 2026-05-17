import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const productInclude = {
  unit: {
    select: { id: true, name: true, abbreviation: true, allowsDecimal: true },
  },
  tax: { select: { id: true, rate: true, name: true } },
  barcodes: true,
  prices: true,
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

@Injectable()
export class PosSyncService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Flatten a product into the denormalized shape the offline POS stores in
   * IndexedDB: a single resolved price (default list, branch override wins),
   * the tax rate inline and a plain list of barcodes.
   */
  private mapProduct(p: ProductRow, branchId: number, defaultListId: number) {
    const candidates = p.prices.filter(
      (pr) => pr.priceListId === defaultListId,
    );
    const branchPrice = candidates.find((pr) => pr.branchId === branchId);
    const globalPrice = candidates.find((pr) => pr.branchId === null);
    const resolved = branchPrice ?? globalPrice ?? candidates[0];

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      sellType: p.sellType,
      trackStock: p.trackStock,
      isActive: p.isActive,
      unitId: p.unitId,
      unitName: p.unit.name,
      unitAbbreviation: p.unit.abbreviation,
      allowsDecimal: p.unit.allowsDecimal,
      categoryId: p.categoryId,
      taxRate: p.tax ? Number(p.tax.rate) : 0,
      taxName: p.tax?.name ?? null,
      requiresPrescription: p.requiresPrescription,
      price: resolved ? Number(resolved.price) : 0,
      cost: resolved ? Number(resolved.cost) : 0,
      updatedAt: p.updatedAt,
      barcodes: p.barcodes.map((b) => ({
        code: b.code,
        isPrimary: b.isPrimary,
        packQuantity: Number(b.packQuantity),
      })),
    };
  }

  private async resolveDefaultListId() {
    const list = await this.prisma.priceList.findFirst({
      where: { isDefault: true, isActive: true },
      orderBy: { id: 'asc' },
    });
    if (!list) {
      throw new BadRequestException(
        'No hay una lista de precios predeterminada configurada',
      );
    }
    return list.id;
  }

  private async assertBranch(branchId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new BadRequestException(`La sucursal ${branchId} no existe`);
    }
  }

  private async loadPromotions() {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    });
    return promotions.map((pr) => ({
      id: pr.id,
      name: pr.name,
      type: pr.type,
      value: Number(pr.value),
      buyQty: pr.buyQty,
      payQty: pr.payQty,
      scope: pr.scope,
      productId: pr.productId,
      categoryId: pr.categoryId,
    }));
  }

  private async loadCustomers() {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      creditEnabled: c.creditEnabled,
      creditLimit: Number(c.creditLimit),
      creditBalance: Number(c.creditBalance),
      loyaltyPoints: c.loyaltyPoints,
    }));
  }

  private async loadPaymentMethods() {
    const methods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
    return methods.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      requiresReference: m.requiresReference,
    }));
  }

  // ── GET /pos-sync/bootstrap ───────────────────────────────
  /** Full offline snapshot for a branch: catalog + promotions + customers. */
  async bootstrap(branchId: number) {
    await this.assertBranch(branchId);
    const defaultListId = await this.resolveDefaultListId();
    const serverTime = new Date();

    const [products, promotions, customers, paymentMethods] = await Promise.all(
      [
        this.prisma.product.findMany({
          where: { isActive: true },
          include: productInclude,
          orderBy: { name: 'asc' },
        }),
        this.loadPromotions(),
        this.loadCustomers(),
        this.loadPaymentMethods(),
      ],
    );

    return {
      data: {
        branchId,
        serverTime,
        products: products.map((p) =>
          this.mapProduct(p, branchId, defaultListId),
        ),
        promotions,
        customers,
        paymentMethods,
      },
      meta: { full: true },
    };
  }

  // ── GET /pos-sync/delta ───────────────────────────────────
  /** Incremental snapshot: products changed since `since`, fresh lookups. */
  async delta(branchId: number, since?: string) {
    await this.assertBranch(branchId);
    const defaultListId = await this.resolveDefaultListId();
    const serverTime = new Date();
    const sinceDate = since ? new Date(since) : null;

    const [products, promotions, customers, paymentMethods] = await Promise.all(
      [
        this.prisma.product.findMany({
          where: sinceDate ? { updatedAt: { gt: sinceDate } } : {},
          include: productInclude,
          orderBy: { name: 'asc' },
        }),
        this.loadPromotions(),
        this.loadCustomers(),
        this.loadPaymentMethods(),
      ],
    );

    return {
      data: {
        branchId,
        serverTime,
        since: sinceDate,
        products: products.map((p) =>
          this.mapProduct(p, branchId, defaultListId),
        ),
        promotions,
        customers,
        paymentMethods,
      },
      meta: { full: false },
    };
  }
}
