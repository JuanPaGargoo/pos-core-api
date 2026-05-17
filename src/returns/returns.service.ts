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
import { CreateReturnDto, PaginationQueryDto } from './dto';

const returnInclude = {
  sale: { select: { id: true, folio: true } },
  user: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
} satisfies Prisma.SaleReturnInclude;

type ReturnWithRelations = Prisma.SaleReturnGetPayload<{
  include: typeof returnInclude;
}>;

const round = (n: number) => Math.round(n * 100) / 100;

function mapReturn(r: ReturnWithRelations) {
  return {
    id: r.id,
    folio: r.folio,
    saleId: r.saleId,
    sale: r.sale,
    branchId: r.branchId,
    reason: r.reason,
    total: Number(r.total),
    refundMethod: r.refundMethod,
    createdAt: r.createdAt,
    userId: r.userId,
    user: r.user,
    items: r.items.map((i) => ({
      id: i.id,
      saleItemId: i.saleItemId,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      quantity: Number(i.quantity),
      lineTotal: Number(i.lineTotal),
      restock: i.restock,
    })),
  };
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
    private readonly inventory: InventoryService,
  ) {}

  // ── GET /returns ──────────────────────────────────────────
  async getReturns(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleReturnWhereInput = {};
    if (query.saleId) where.saleId = query.saleId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.search) {
      where.OR = [
        { folio: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [returns, total] = await Promise.all([
      this.prisma.saleReturn.findMany({
        where,
        include: returnInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.saleReturn.count({ where }),
    ]);

    return {
      data: returns.map(mapReturn),
      meta: { page, limit, total },
    };
  }

  // ── GET /returns/:id ──────────────────────────────────────
  async getReturnById(id: number) {
    const saleReturn = await this.prisma.saleReturn.findUnique({
      where: { id },
      include: returnInclude,
    });
    if (!saleReturn) {
      throw new NotFoundException(`Devolución con id ${id} no encontrada`);
    }
    return { data: mapReturn(saleReturn), meta: {} };
  }

  // ── POST /returns ─────────────────────────────────────────
  async createReturn(dto: CreateReturnDto, userId: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId },
      include: { items: true },
    });
    if (!sale) {
      throw new NotFoundException(`Venta con id ${dto.saleId} no encontrada`);
    }
    if (sale.status !== 'COMPLETED') {
      throw new ConflictException('Solo se pueden devolver ventas completadas');
    }

    const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));

    // Quantities already returned per sale line.
    const priorReturns = await this.prisma.saleReturnItem.groupBy({
      by: ['saleItemId'],
      where: { saleItemId: { in: sale.items.map((i) => i.id) } },
      _sum: { quantity: true },
    });
    const returnedMap = new Map(
      priorReturns.map((p) => [p.saleItemId, Number(p._sum.quantity ?? 0)]),
    );

    // Validate and build return lines.
    let total = 0;
    const lines = dto.items.map((item) => {
      const saleItem = saleItemMap.get(item.saleItemId);
      if (!saleItem) {
        throw new BadRequestException(
          `La línea ${item.saleItemId} no pertenece a la venta`,
        );
      }
      const sold = Number(saleItem.quantity);
      const alreadyReturned = returnedMap.get(item.saleItemId) ?? 0;
      const available = round(sold - alreadyReturned);
      if (item.quantity > available + 0.001) {
        throw new BadRequestException(
          `No puedes devolver ${item.quantity} de "${saleItem.productName}"; disponible: ${available}`,
        );
      }
      // Per-unit price after the line's discount.
      const unitNet = Number(saleItem.lineTotal) / sold;
      const lineTotal = round(item.quantity * unitNet);
      total = round(total + lineTotal);
      return {
        saleItemId: item.saleItemId,
        productId: saleItem.productId,
        quantity: item.quantity,
        lineTotal,
        restock: item.restock !== false,
      };
    });

    // Credit-balance refunds require a credit customer with enough debt.
    if (dto.refundMethod === 'CREDIT_BALANCE') {
      if (!sale.customerId) {
        throw new BadRequestException(
          'La venta no tiene cliente; usa otra forma de reembolso',
        );
      }
      const customer = await this.prisma.customer.findUnique({
        where: { id: sale.customerId },
      });
      if (!customer || Number(customer.creditBalance) + 0.001 < total) {
        throw new BadRequestException(
          'El monto supera el saldo del cliente; usa otra forma de reembolso',
        );
      }
    }

    // Map each sold product to the warehouse it was dispatched from.
    const saleMovements = await this.prisma.stockMovement.findMany({
      where: { refType: 'Sale', refId: sale.id, type: 'SALE' },
      select: { productId: true, warehouseId: true },
    });
    const warehouseByProduct = new Map(
      saleMovements.map((m) => [m.productId, m.warehouseId]),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const folio = await this.sequences.getNextNumber(
        sale.branchId,
        'credit_note',
        tx,
      );

      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId: sale.id,
          branchId: sale.branchId,
          folio,
          reason: dto.reason,
          total,
          refundMethod: dto.refundMethod,
          userId,
          items: { create: lines },
        },
      });

      // Restock returned units to their originating warehouse.
      for (const line of lines) {
        if (!line.restock) continue;
        const warehouseId = warehouseByProduct.get(line.productId);
        if (!warehouseId) continue;
        await this.inventory.applyMovement(tx, {
          productId: line.productId,
          warehouseId,
          type: 'RETURN',
          quantity: line.quantity,
          refType: 'Return',
          refId: saleReturn.id,
          note: `Devolución ${folio}`,
          userId,
        });
      }

      // Credit-balance refund pays down the customer's debt.
      if (dto.refundMethod === 'CREDIT_BALANCE' && sale.customerId) {
        const customer = await tx.customer.findUniqueOrThrow({
          where: { id: sale.customerId },
        });
        const newBalance = round(Number(customer.creditBalance) - total);
        await tx.customerCreditEntry.create({
          data: {
            customerId: sale.customerId,
            branchId: sale.branchId,
            type: 'PAYMENT',
            amount: -total,
            balanceAfter: newBalance,
            refType: 'Return',
            refId: saleReturn.id,
            note: `Devolución ${folio}`,
            userId,
          },
        });
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { creditBalance: newBalance },
        });
      }

      return tx.saleReturn.findUniqueOrThrow({
        where: { id: saleReturn.id },
        include: returnInclude,
      });
    });

    return { data: mapReturn(created), meta: {} };
  }
}
