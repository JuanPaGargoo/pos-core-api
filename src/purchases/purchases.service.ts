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
import { CreatePurchaseDto, PaginationQueryDto } from './dto';

const purchaseInclude = {
  supplier: { select: { id: true, name: true } },
  warehouse: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
} satisfies Prisma.PurchaseInclude;

type PurchaseWithRelations = Prisma.PurchaseGetPayload<{
  include: typeof purchaseInclude;
}>;

const round = (n: number) => Math.round(n * 100) / 100;

function mapPurchase(p: PurchaseWithRelations) {
  return {
    id: p.id,
    folio: p.folio,
    branchId: p.branchId,
    warehouseId: p.warehouseId,
    warehouse: p.warehouse,
    supplierId: p.supplierId,
    supplier: p.supplier,
    status: p.status,
    invoiceRef: p.invoiceRef,
    subtotal: Number(p.subtotal),
    taxTotal: Number(p.taxTotal),
    total: Number(p.total),
    receivedAt: p.receivedAt,
    createdAt: p.createdAt,
    userId: p.userId,
    user: p.user,
    items: p.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      quantity: Number(i.quantity),
      unitCost: Number(i.unitCost),
      lineTotal: Number(i.lineTotal),
    })),
  };
}

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
    private readonly inventory: InventoryService,
  ) {}

  // ── GET /purchases ────────────────────────────────────────
  async getPurchases(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {};
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        include: purchaseInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      data: purchases.map(mapPurchase),
      meta: { page, limit, total },
    };
  }

  // ── GET /purchases/:id ────────────────────────────────────
  async getPurchaseById(id: number) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: purchaseInclude,
    });
    if (!purchase) {
      throw new NotFoundException(`Compra con id ${id} no encontrada`);
    }
    return { data: mapPurchase(purchase), meta: {} };
  }

  // ── POST /purchases ───────────────────────────────────────
  async createPurchase(dto: CreatePurchaseDto, userId: number) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse || warehouse.branchId !== dto.branchId) {
      throw new BadRequestException(
        'El almacén no existe o no pertenece a la sucursal indicada',
      );
    }

    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new BadRequestException(
        `El proveedor con id ${dto.supplierId} no existe`,
      );
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const found = await this.prisma.product.count({
      where: { id: { in: productIds } },
    });
    if (found !== productIds.length) {
      throw new BadRequestException('Uno o más productos indicados no existen');
    }

    let subtotal = 0;
    const lines = dto.items.map((item) => {
      const lineTotal = round(item.quantity * item.unitCost);
      subtotal = round(subtotal + lineTotal);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal,
      };
    });

    const purchase = await this.prisma.$transaction(async (tx) => {
      const folio = await this.sequences.getNextNumber(
        dto.branchId,
        'purchase_order',
        tx,
      );

      const created = await tx.purchase.create({
        data: {
          branchId: dto.branchId,
          warehouseId: dto.warehouseId,
          supplierId: dto.supplierId,
          folio,
          status: 'DRAFT',
          invoiceRef: dto.invoiceRef ?? null,
          subtotal,
          taxTotal: 0,
          total: subtotal,
          userId,
          items: { create: lines },
        },
      });

      return tx.purchase.findUniqueOrThrow({
        where: { id: created.id },
        include: purchaseInclude,
      });
    });

    return { data: mapPurchase(purchase), meta: {} };
  }

  // ── POST /purchases/:id/receive ───────────────────────────
  async receivePurchase(id: number, userId: number) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) {
      throw new NotFoundException(`Compra con id ${id} no encontrada`);
    }
    if (purchase.status !== 'DRAFT') {
      throw new ConflictException(
        'Solo se pueden recibir compras en estado borrador',
      );
    }

    const defaultList = await this.prisma.priceList.findFirst({
      where: { isDefault: true },
    });

    const received = await this.prisma.$transaction(async (tx) => {
      await tx.purchase.update({
        where: { id },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      });

      for (const item of purchase.items) {
        // Add stock through the inventory ledger.
        await this.inventory.applyMovement(tx, {
          productId: item.productId,
          warehouseId: purchase.warehouseId,
          type: 'PURCHASE',
          quantity: item.quantity,
          unitCost: Number(item.unitCost),
          refType: 'Purchase',
          refId: purchase.id,
          note: `Compra ${purchase.folio}`,
          userId,
        });

        // Refresh the product cost on the default price list.
        if (defaultList) {
          await tx.productPrice.updateMany({
            where: { productId: item.productId, priceListId: defaultList.id },
            data: { cost: item.unitCost },
          });
        }
      }

      return tx.purchase.findUniqueOrThrow({
        where: { id },
        include: purchaseInclude,
      });
    });

    return { data: mapPurchase(received), meta: {} };
  }

  // ── POST /purchases/:id/cancel ────────────────────────────
  async cancelPurchase(id: number) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id } });
    if (!purchase) {
      throw new NotFoundException(`Compra con id ${id} no encontrada`);
    }
    if (purchase.status !== 'DRAFT') {
      throw new ConflictException(
        'Solo se pueden cancelar compras en estado borrador',
      );
    }

    const cancelled = await this.prisma.purchase.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: purchaseInclude,
    });

    return { data: mapPurchase(cancelled), meta: {} };
  }
}
