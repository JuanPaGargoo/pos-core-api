import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  AddLayawayPaymentDto,
  CreateSaleDto,
  PaginationQueryDto,
  SaleItemInputDto,
  SyncSaleDto,
  SyncSalesDto,
} from './dto';

type LoyaltyConfig = { enabled: boolean; pointsPerCurrency: number };

type SyncResult = {
  clientUuid: string;
  status: 'synced' | 'duplicate' | 'failed';
  sale?: ReturnType<typeof mapSale>;
  message?: string;
};

const saleInclude = {
  items: true,
  payments: {
    include: {
      paymentMethod: { select: { id: true, name: true, type: true } },
    },
  },
  user: { select: { id: true, name: true } },
  cashSession: { select: { id: true, folio: true } },
  customer: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

const round = (n: number) => Math.round(n * 100) / 100;

function mapSale(s: SaleWithRelations) {
  return {
    id: s.id,
    clientUuid: s.clientUuid,
    folio: s.folio,
    branchId: s.branchId,
    warehouseId: s.warehouseId,
    cashSessionId: s.cashSessionId,
    cashSession: s.cashSession,
    customerId: s.customerId,
    customer: s.customer,
    userId: s.userId,
    user: s.user,
    status: s.status,
    type: s.type,
    subtotal: Number(s.subtotal),
    discountTotal: Number(s.discountTotal),
    taxTotal: Number(s.taxTotal),
    total: Number(s.total),
    paidTotal: Number(s.paidTotal),
    changeGiven: Number(s.changeGiven),
    isCredit: s.isCredit,
    soldAt: s.soldAt,
    createdAt: s.createdAt,
    items: s.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount),
      promotionId: i.promotionId,
      taxRate: Number(i.taxRate),
      lineTotal: Number(i.lineTotal),
    })),
    payments: s.payments.map((p) => ({
      id: p.id,
      paymentMethodId: p.paymentMethodId,
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount),
      reference: p.reference,
    })),
  };
}

type BuiltLine = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  promotionId: number | null;
  taxRate: number;
  lineTotal: number;
  trackStock: boolean;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
    private readonly inventory: InventoryService,
  ) {}

  // ── GET /sales ────────────────────────────────────────────
  async getSales(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.cashSessionId) where.cashSessionId = query.cashSessionId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.soldAt = {};
      if (query.from) where.soldAt.gte = new Date(query.from);
      if (query.to) where.soldAt.lte = new Date(query.to);
    }

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        include: saleInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: sales.map(mapSale),
      meta: { page, limit, total },
    };
  }

  // ── GET /sales/:id ────────────────────────────────────────
  async getSaleById(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: saleInclude,
    });
    if (!sale) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }
    return { data: mapSale(sale), meta: {} };
  }

  // ── POST /sales ───────────────────────────────────────────
  async createSale(dto: CreateSaleDto, userId: number) {
    await this.assertWarehouse(dto.warehouseId, dto.branchId);

    if (dto.cashSessionId) {
      await this.assertOpenSession(dto.cashSessionId, dto.branchId);
    }

    const { lines, subtotal, discountTotal, taxTotal, total } =
      await this.buildLines(dto.items);

    const payments = dto.payments ?? [];
    const paidTotal = round(payments.reduce((acc, p) => acc + p.amount, 0));

    const customer =
      dto.customerId != null
        ? await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
          })
        : null;
    if (dto.customerId != null && !customer) {
      throw new BadRequestException(
        `El cliente con id ${dto.customerId} no existe`,
      );
    }

    // Amount left unpaid that becomes credit ("fiado").
    const creditAmount =
      dto.isCredit === true ? round(Math.max(0, total - paidTotal)) : 0;
    const isCredit = creditAmount > 0;

    if (isCredit) {
      if (!customer) {
        throw new BadRequestException(
          'Una venta a crédito requiere un cliente',
        );
      }
      if (!customer.creditEnabled) {
        throw new BadRequestException(
          `El cliente "${customer.name}" no tiene crédito habilitado`,
        );
      }
    } else if (payments.length === 0 || paidTotal + 0.001 < total) {
      throw new BadRequestException(
        `El pago recibido (${paidTotal}) es menor al total (${total})`,
      );
    }

    const changeGiven = isCredit ? 0 : round(paidTotal - total);
    const soldAt = dto.soldAt ? new Date(dto.soldAt) : new Date();
    const loyalty = await this.loyaltyConfig();

    const sale = await this.prisma.$transaction(async (tx) => {
      const folio = await this.sequences.getNextNumber(
        dto.branchId,
        'sale',
        tx,
      );

      const created = await tx.sale.create({
        data: {
          clientUuid: randomUUID(),
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          cashSessionId: dto.cashSessionId ?? null,
          customerId: dto.customerId ?? null,
          userId,
          folio,
          status: 'COMPLETED',
          type: 'SALE',
          isCredit,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          paidTotal,
          changeGiven,
          soldAt,
          syncedAt: new Date(),
          items: { create: lines.map(toSaleItemData) },
          payments: {
            create: payments.map((p) => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
              reference: p.reference ?? null,
            })),
          },
        },
      });

      await this.deductStock(
        tx,
        lines,
        dto.warehouseId,
        created.id,
        folio,
        userId,
      );

      if (isCredit && customer) {
        const newBalance = round(Number(customer.creditBalance) + creditAmount);
        await tx.customerCreditEntry.create({
          data: {
            customerId: customer.id,
            branchId: dto.branchId,
            type: 'CHARGE',
            amount: creditAmount,
            balanceAfter: newBalance,
            refType: 'Sale',
            refId: created.id,
            note: `Venta a crédito ${folio}`,
            userId,
          },
        });
        await tx.customer.update({
          where: { id: customer.id },
          data: { creditBalance: newBalance },
        });
      }

      if (customer) {
        await this.accrueLoyalty(tx, customer.id, total, loyalty);
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: created.id },
        include: saleInclude,
      });
    });

    return { data: mapSale(sale), meta: {} };
  }

  // ── POST /sales/layaway ───────────────────────────────────
  async createLayaway(dto: CreateSaleDto, userId: number) {
    await this.assertWarehouse(dto.warehouseId, dto.branchId);
    if (dto.customerId == null) {
      throw new BadRequestException('Un apartado requiere un cliente');
    }
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new BadRequestException(
        `El cliente con id ${dto.customerId} no existe`,
      );
    }

    const { lines, subtotal, discountTotal, taxTotal, total } =
      await this.buildLines(dto.items);

    const payments = dto.payments ?? [];
    const paidTotal = round(payments.reduce((acc, p) => acc + p.amount, 0));
    if (paidTotal > total + 0.001) {
      throw new BadRequestException(
        'El anticipo no puede superar el total del apartado',
      );
    }

    const sale = await this.prisma.$transaction(async (tx) => {
      const folio = await this.sequences.getNextNumber(
        dto.branchId,
        'sale',
        tx,
      );
      const created = await tx.sale.create({
        data: {
          clientUuid: randomUUID(),
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          customerId: dto.customerId,
          userId,
          folio,
          status: 'LAYAWAY',
          type: 'LAYAWAY',
          subtotal,
          discountTotal,
          taxTotal,
          total,
          paidTotal,
          changeGiven: 0,
          soldAt: new Date(),
          items: { create: lines.map(toSaleItemData) },
          payments: {
            create: payments.map((p) => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
              reference: p.reference ?? null,
            })),
          },
        },
      });
      return tx.sale.findUniqueOrThrow({
        where: { id: created.id },
        include: saleInclude,
      });
    });

    return { data: mapSale(sale), meta: {} };
  }

  // ── POST /sales/:id/layaway-payment ───────────────────────
  async addLayawayPayment(
    id: number,
    dto: AddLayawayPaymentDto,
    userId: number,
  ) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException(`Apartado con id ${id} no encontrado`);
    }
    if (sale.type !== 'LAYAWAY' || sale.status !== 'LAYAWAY') {
      throw new ConflictException('La venta no es un apartado activo');
    }

    const total = Number(sale.total);
    const paidTotal = Number(sale.paidTotal);
    const remaining = round(total - paidTotal);
    if (dto.amount > remaining + 0.001) {
      throw new BadRequestException(
        `El abono (${dto.amount}) supera el saldo pendiente (${remaining})`,
      );
    }

    const newPaid = round(paidTotal + dto.amount);
    const completes = newPaid + 0.001 >= total;

    // Resolve which products track stock (needed only on completion).
    const products = completes
      ? await this.prisma.product.findMany({
          where: { id: { in: sale.items.map((i) => i.productId) } },
          select: { id: true, trackStock: true },
        })
      : [];
    const trackMap = new Map(products.map((p) => [p.id, p.trackStock]));
    const loyalty = completes ? await this.loyaltyConfig() : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.salePayment.create({
        data: {
          saleId: id,
          paymentMethodId: dto.paymentMethodId,
          amount: dto.amount,
          reference: dto.reference ?? null,
        },
      });
      await tx.sale.update({
        where: { id },
        data: {
          paidTotal: newPaid,
          ...(completes && {
            status: 'COMPLETED',
            syncedAt: new Date(),
          }),
        },
      });

      if (completes && sale.warehouseId) {
        for (const item of sale.items) {
          if (!trackMap.get(item.productId)) continue;
          await this.inventory.applyMovement(tx, {
            productId: item.productId,
            warehouseId: sale.warehouseId,
            type: 'SALE',
            quantity: -Number(item.quantity),
            refType: 'Sale',
            refId: id,
            note: `Apartado liquidado ${sale.folio ?? id}`,
            userId,
          });
        }
        if (sale.customerId && loyalty) {
          await this.accrueLoyalty(tx, sale.customerId, total, loyalty);
        }
      }

      return tx.sale.findUniqueOrThrow({
        where: { id },
        include: saleInclude,
      });
    });

    return { data: mapSale(updated), meta: {} };
  }

  // ── POST /sales/:id/cancel ────────────────────────────────
  async cancelSale(id: number, userId: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException(`Venta con id ${id} no encontrada`);
    }

    // A layaway never committed stock — just void it.
    if (sale.status === 'LAYAWAY') {
      const cancelled = await this.prisma.sale.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: saleInclude,
      });
      return { data: mapSale(cancelled), meta: {} };
    }

    if (sale.status !== 'COMPLETED') {
      throw new ConflictException('Solo se pueden cancelar ventas completadas');
    }

    const saleMovements = await this.prisma.stockMovement.findMany({
      where: { refType: 'Sale', refId: id, type: 'SALE' },
    });

    const sale2 = await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id }, data: { status: 'CANCELLED' } });

      for (const mv of saleMovements) {
        await this.inventory.applyMovement(tx, {
          productId: mv.productId,
          warehouseId: mv.warehouseId,
          type: 'ADJUSTMENT',
          quantity: mv.quantity.negated(),
          refType: 'Sale',
          refId: id,
          note: `Cancelación de venta ${sale.folio ?? id}`,
          userId,
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id },
        include: saleInclude,
      });
    });

    return { data: mapSale(sale2), meta: {} };
  }

  // ── POST /sales/sync ──────────────────────────────────────
  /**
   * Idempotent batch sync of offline sales. Each sale is keyed by its
   * `clientUuid`: a sale already present is reported as `duplicate` and never
   * re-applied. Sales are never rejected — a failure on one does not abort the
   * batch; the result array lets the client mark each pending sale.
   */
  async syncSales(dto: SyncSalesDto, userId: number) {
    const loyalty = await this.loyaltyConfig();
    const results: SyncResult[] = [];

    for (const input of dto.sales) {
      try {
        const existing = await this.prisma.sale.findUnique({
          where: { clientUuid: input.clientUuid },
          include: saleInclude,
        });
        if (existing) {
          results.push({
            clientUuid: input.clientUuid,
            status: 'duplicate',
            sale: mapSale(existing),
          });
          continue;
        }

        const sale = await this.createOfflineSale(input, userId, loyalty);
        results.push({
          clientUuid: input.clientUuid,
          status: 'synced',
          sale: mapSale(sale),
        });
      } catch (err) {
        // A concurrent batch may have inserted the same clientUuid first.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          const dup = await this.prisma.sale.findUnique({
            where: { clientUuid: input.clientUuid },
            include: saleInclude,
          });
          if (dup) {
            results.push({
              clientUuid: input.clientUuid,
              status: 'duplicate',
              sale: mapSale(dup),
            });
            continue;
          }
        }
        results.push({
          clientUuid: input.clientUuid,
          status: 'failed',
          message: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }

    const synced = results.filter((r) => r.status === 'synced').length;
    const duplicate = results.filter((r) => r.status === 'duplicate').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return {
      data: results,
      meta: { total: results.length, synced, duplicate, failed },
    };
  }

  /**
   * Persist a single offline sale. Lenient by design: stock may go negative,
   * credit limits are not enforced and underpayment is trusted — offline sales
   * are historical facts the server must not reject.
   */
  private async createOfflineSale(
    input: SyncSaleDto,
    userId: number,
    loyalty: LoyaltyConfig,
  ) {
    await this.assertWarehouse(input.warehouseId, input.branchId);

    const { lines, subtotal, discountTotal, taxTotal, total } =
      await this.buildLines(input.items);

    const payments = input.payments ?? [];
    const paidTotal = round(payments.reduce((acc, p) => acc + p.amount, 0));

    const customer =
      input.customerId != null
        ? await this.prisma.customer.findUnique({
            where: { id: input.customerId },
          })
        : null;

    const creditAmount =
      input.isCredit === true && customer
        ? round(Math.max(0, total - paidTotal))
        : 0;
    const isCredit = creditAmount > 0;
    const changeGiven = isCredit ? 0 : round(Math.max(0, paidTotal - total));

    // Resolve the cash session leniently — drop it if no longer valid.
    let cashSessionId: number | null = null;
    if (input.cashSessionId) {
      const session = await this.prisma.cashSession.findUnique({
        where: { id: input.cashSessionId },
      });
      if (
        session &&
        session.status === 'OPEN' &&
        session.branchId === input.branchId
      ) {
        cashSessionId = session.id;
      }
    }

    const soldAt = new Date(input.soldAt);

    return this.prisma.$transaction(async (tx) => {
      const folio = await this.sequences.getNextNumber(
        input.branchId,
        'sale',
        tx,
      );

      const created = await tx.sale.create({
        data: {
          clientUuid: input.clientUuid,
          branchId: input.branchId,
          warehouseId: input.warehouseId,
          cashSessionId,
          customerId: input.customerId ?? null,
          userId,
          folio,
          status: 'COMPLETED',
          type: 'SALE',
          isCredit,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          paidTotal,
          changeGiven,
          soldAt,
          syncedAt: new Date(),
          items: { create: lines.map(toSaleItemData) },
          payments: {
            create: payments.map((p) => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
              reference: p.reference ?? null,
            })),
          },
        },
      });

      await this.deductStock(
        tx,
        lines,
        input.warehouseId,
        created.id,
        folio,
        userId,
      );

      if (isCredit && customer) {
        const newBalance = round(Number(customer.creditBalance) + creditAmount);
        await tx.customerCreditEntry.create({
          data: {
            customerId: customer.id,
            branchId: input.branchId,
            type: 'CHARGE',
            amount: creditAmount,
            balanceAfter: newBalance,
            refType: 'Sale',
            refId: created.id,
            note: `Venta a crédito ${folio} (offline)`,
            userId,
          },
        });
        await tx.customer.update({
          where: { id: customer.id },
          data: { creditBalance: newBalance },
        });
      }

      if (customer) {
        await this.accrueLoyalty(tx, customer.id, total, loyalty);
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: created.id },
        include: saleInclude,
      });
    });
  }

  // ── helpers ───────────────────────────────────────────────
  private async assertWarehouse(warehouseId: number, branchId: number) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse || warehouse.branchId !== branchId) {
      throw new BadRequestException(
        'El almacén no existe o no pertenece a la sucursal indicada',
      );
    }
  }

  private async assertOpenSession(sessionId: number, branchId: number) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.status !== 'OPEN') {
      throw new BadRequestException('La caja indicada no está abierta');
    }
    if (session.branchId !== branchId) {
      throw new BadRequestException(
        'La caja no pertenece a la sucursal indicada',
      );
    }
  }

  /** Resolve products, validate lines and compute the sale totals. */
  private async buildLines(items: SaleItemInputDto[]) {
    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { tax: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const lines: BuiltLine[] = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(
          `El producto con id ${item.productId} no existe`,
        );
      }
      const discount = item.discount ?? 0;
      const gross = round(item.quantity * item.unitPrice);
      const lineTotal = round(gross - discount);
      if (lineTotal < 0) {
        throw new BadRequestException(
          `El descuento supera el importe de "${product.name}"`,
        );
      }
      const taxRate = product.tax ? Number(product.tax.rate) : 0;
      const lineTax =
        taxRate > 0 ? round(lineTotal - lineTotal / (1 + taxRate / 100)) : 0;

      subtotal = round(subtotal + gross);
      discountTotal = round(discountTotal + discount);
      taxTotal = round(taxTotal + lineTax);

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount,
        promotionId: item.promotionId ?? null,
        taxRate,
        lineTotal,
        trackStock: product.trackStock,
      };
    });

    return {
      lines,
      subtotal,
      discountTotal,
      taxTotal,
      total: round(subtotal - discountTotal),
    };
  }

  private async deductStock(
    tx: Prisma.TransactionClient,
    lines: BuiltLine[],
    warehouseId: number,
    saleId: number,
    folio: string,
    userId: number,
  ) {
    for (const line of lines) {
      if (!line.trackStock) continue;
      await this.inventory.applyMovement(tx, {
        productId: line.productId,
        warehouseId,
        type: 'SALE',
        quantity: -line.quantity,
        refType: 'Sale',
        refId: saleId,
        note: `Venta ${folio}`,
        userId,
      });
    }
  }

  /** Read the loyalty program config from global settings. */
  private async loyaltyConfig() {
    const settings = await this.prisma.setting.findMany({
      where: {
        scope: 'global',
        branchId: null,
        key: { in: ['loyalty.enabled', 'loyalty.pointsPerCurrency'] },
      },
    });
    const map = new Map(settings.map((s) => [s.key, s.valueJson]));
    return {
      enabled: map.get('loyalty.enabled') === true,
      pointsPerCurrency: Number(map.get('loyalty.pointsPerCurrency') ?? 0),
    };
  }

  private async accrueLoyalty(
    tx: Prisma.TransactionClient,
    customerId: number,
    total: number,
    loyalty: { enabled: boolean; pointsPerCurrency: number },
  ) {
    if (!loyalty.enabled || loyalty.pointsPerCurrency <= 0) return;
    const points = Math.floor(total * loyalty.pointsPerCurrency);
    if (points <= 0) return;
    await tx.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { increment: points } },
    });
  }
}

function toSaleItemData(l: BuiltLine) {
  return {
    productId: l.productId,
    productName: l.productName,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discount: l.discount,
    promotionId: l.promotionId,
    taxRate: l.taxRate,
    lineTotal: l.lineTotal,
  };
}
