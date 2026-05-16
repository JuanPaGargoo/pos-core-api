import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto } from './dto';

const num = (v: Prisma.Decimal | null | undefined) => (v ? Number(v) : 0);
const round = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Build the shared `where` for COMPLETED sales in the requested window. */
  private saleWhere(query: ReportQueryDto): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = { status: 'COMPLETED' };
    if (query.branchId) where.branchId = query.branchId;
    if (query.from || query.to) {
      where.soldAt = {};
      if (query.from) where.soldAt.gte = new Date(query.from);
      if (query.to) where.soldAt.lte = new Date(query.to);
    }
    return where;
  }

  // ── GET /reports/sales-summary ────────────────────────────
  async salesSummary(query: ReportQueryDto) {
    const where = this.saleWhere(query);

    const agg = await this.prisma.sale.aggregate({
      where,
      _count: { _all: true },
      _sum: {
        total: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
      },
    });
    const count = agg._count._all;
    const total = num(agg._sum.total);

    const payments = await this.prisma.salePayment.groupBy({
      by: ['paymentMethodId'],
      where: { sale: where },
      _sum: { amount: true },
      _count: { _all: true },
    });
    const methods = await this.prisma.paymentMethod.findMany({
      where: { id: { in: payments.map((p) => p.paymentMethodId) } },
      select: { id: true, name: true },
    });
    const methodName = new Map(methods.map((m) => [m.id, m.name]));

    return {
      data: {
        salesCount: count,
        total: round(total),
        subtotal: round(num(agg._sum.subtotal)),
        discountTotal: round(num(agg._sum.discountTotal)),
        taxTotal: round(num(agg._sum.taxTotal)),
        averageTicket: count > 0 ? round(total / count) : 0,
        byPaymentMethod: payments
          .map((p) => ({
            paymentMethodId: p.paymentMethodId,
            paymentMethod: methodName.get(p.paymentMethodId) ?? 'Desconocido',
            count: p._count._all,
            amount: round(num(p._sum.amount)),
          }))
          .sort((a, b) => b.amount - a.amount),
      },
      meta: { from: query.from ?? null, to: query.to ?? null },
    };
  }

  // ── GET /reports/top-products ─────────────────────────────
  async topProducts(query: ReportQueryDto) {
    const limit = query.limit ?? 10;
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: { sale: this.saleWhere(query) },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: limit,
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, name: true, sku: true },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    return {
      data: grouped.map((g) => ({
        productId: g.productId,
        name: productById.get(g.productId)?.name ?? `#${g.productId}`,
        sku: productById.get(g.productId)?.sku ?? '',
        quantity: round(num(g._sum.quantity)),
        revenue: round(num(g._sum.lineTotal)),
      })),
      meta: { limit },
    };
  }

  // ── GET /reports/inventory-valuation ──────────────────────
  /** On-hand inventory valued at the default-price-list cost. */
  async inventoryValuation(query: ReportQueryDto) {
    const where: Prisma.StockLevelWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;

    const levels = await this.prisma.stockLevel.findMany({ where });

    const defaultList = await this.prisma.priceList.findFirst({
      where: { isDefault: true },
      orderBy: { id: 'asc' },
    });
    const prices = defaultList
      ? await this.prisma.productPrice.findMany({
          where: { priceListId: defaultList.id },
        })
      : [];

    // Cost per product: branch-specific override wins over the global price.
    const costOf = (productId: number, branchId: number) => {
      const candidates = prices.filter((p) => p.productId === productId);
      const branchPrice = candidates.find((p) => p.branchId === branchId);
      const globalPrice = candidates.find((p) => p.branchId === null);
      return num((branchPrice ?? globalPrice ?? candidates[0])?.cost);
    };

    let totalUnits = 0;
    let totalValue = 0;
    for (const level of levels) {
      const qty = num(level.quantity);
      totalUnits += qty;
      totalValue += qty * costOf(level.productId, level.branchId);
    }

    return {
      data: {
        stockRecords: levels.length,
        totalUnits: round(totalUnits),
        totalValue: round(totalValue),
      },
      meta: {},
    };
  }

  /** Stock levels matching a quantity predicate, with product/warehouse names. */
  private async stockList(
    query: ReportQueryDto,
    quantity: Prisma.DecimalFilter,
  ) {
    const where: Prisma.StockLevelWhereInput = { quantity };
    if (query.branchId) where.branchId = query.branchId;

    const levels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { quantity: 'asc' },
    });

    return levels.map((l) => ({
      productId: l.productId,
      productName: l.product.name,
      sku: l.product.sku,
      warehouseId: l.warehouseId,
      warehouseName: l.warehouse.name,
      quantity: num(l.quantity),
      reorderPoint: num(l.reorderPoint),
    }));
  }

  // ── GET /reports/low-stock ────────────────────────────────
  async lowStock(query: ReportQueryDto) {
    const where: Prisma.StockLevelWhereInput = {
      reorderPoint: { gt: 0 },
    };
    if (query.branchId) where.branchId = query.branchId;

    const levels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { quantity: 'asc' },
    });

    const rows = levels
      .filter((l) => num(l.quantity) <= num(l.reorderPoint))
      .map((l) => ({
        productId: l.productId,
        productName: l.product.name,
        sku: l.product.sku,
        warehouseId: l.warehouseId,
        warehouseName: l.warehouse.name,
        quantity: num(l.quantity),
        reorderPoint: num(l.reorderPoint),
      }));

    return { data: rows, meta: { count: rows.length } };
  }

  // ── GET /reports/negative-stock ───────────────────────────
  /** Stock that went negative — typically from concurrent offline sales. */
  async negativeStock(query: ReportQueryDto) {
    const rows = await this.stockList(query, { lt: 0 });
    return { data: rows, meta: { count: rows.length } };
  }

  // ── GET /reports/credit ───────────────────────────────────
  async creditReport() {
    const customers = await this.prisma.customer.findMany({
      where: { creditBalance: { gt: 0 } },
      orderBy: { creditBalance: 'desc' },
    });

    const rows = customers.map((c) => ({
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      creditLimit: num(c.creditLimit),
      creditBalance: num(c.creditBalance),
      overLimit:
        num(c.creditLimit) > 0 && num(c.creditBalance) > num(c.creditLimit),
    }));

    return {
      data: rows,
      meta: {
        count: rows.length,
        totalReceivable: round(
          rows.reduce((acc, r) => acc + r.creditBalance, 0),
        ),
      },
    };
  }
}
