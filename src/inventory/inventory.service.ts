import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustStockDto,
  MovementsQueryDto,
  SetReorderPointDto,
  StockQueryDto,
  TransferStockDto,
} from './dto';

/** Input for a single inventory ledger entry. */
export type MovementInput = {
  productId: number;
  warehouseId: number;
  type: string;
  quantity: Prisma.Decimal | number; // signed: negative = stock out
  unitCost?: number | null;
  refType?: string | null;
  refId?: number | null;
  note?: string | null;
  userId?: number | null;
};

const stockInclude = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      unit: { select: { abbreviation: true } },
    },
  },
  warehouse: { select: { id: true, name: true, code: true } },
} satisfies Prisma.StockLevelInclude;

const movementInclude = {
  product: { select: { id: true, name: true, sku: true } },
  warehouse: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementInclude;

type StockLevelWithRelations = Prisma.StockLevelGetPayload<{
  include: typeof stockInclude;
}>;
type MovementWithRelations = Prisma.StockMovementGetPayload<{
  include: typeof movementInclude;
}>;

/**
 * `lowStockThreshold` es el umbral global configurable que se aplica a los
 * productos que no tienen un punto de reorden propio (reorderPoint = 0).
 */
function mapStockLevel(
  s: StockLevelWithRelations,
  lowStockThreshold: number,
) {
  const quantity = Number(s.quantity);
  const reorderPoint = Number(s.reorderPoint);
  const effectiveThreshold =
    reorderPoint > 0 ? reorderPoint : lowStockThreshold;
  return {
    id: s.id,
    productId: s.productId,
    product: {
      id: s.product.id,
      name: s.product.name,
      sku: s.product.sku,
      unit: s.product.unit.abbreviation,
    },
    warehouseId: s.warehouseId,
    warehouse: s.warehouse,
    branchId: s.branchId,
    quantity,
    reorderPoint,
    lowStock: quantity <= effectiveThreshold,
  };
}

function mapMovement(m: MovementWithRelations) {
  return {
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    balanceAfter: Number(m.balanceAfter),
    unitCost: m.unitCost === null ? null : Number(m.unitCost),
    refType: m.refType,
    refId: m.refId,
    note: m.note,
    userId: m.userId,
    user: m.user,
    createdAt: m.createdAt,
    productId: m.productId,
    product: m.product,
    warehouseId: m.warehouseId,
    warehouse: m.warehouse,
  };
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a movement to the inventory ledger and update the denormalized
   * StockLevel cache — both inside the caller's transaction. This is the single
   * entry point every stock change (sales, purchases, returns, adjustments)
   * must go through.
   */
  async applyMovement(tx: Prisma.TransactionClient, input: MovementInput) {
    const warehouse = await tx.warehouse.findUnique({
      where: { id: input.warehouseId },
    });
    if (!warehouse) {
      throw new BadRequestException(
        `El almacén con id ${input.warehouseId} no existe`,
      );
    }

    const key = {
      productId_warehouseId: {
        productId: input.productId,
        warehouseId: input.warehouseId,
      },
    };

    const level = await tx.stockLevel.findUnique({ where: key });
    const current = level ? level.quantity : new Prisma.Decimal(0);
    const qty = new Prisma.Decimal(input.quantity);
    const balanceAfter = current.plus(qty);

    const movement = await tx.stockMovement.create({
      data: {
        productId: input.productId,
        branchId: warehouse.branchId,
        warehouseId: input.warehouseId,
        type: input.type,
        quantity: qty,
        balanceAfter,
        unitCost: input.unitCost ?? null,
        refType: input.refType ?? null,
        refId: input.refId ?? null,
        note: input.note ?? null,
        userId: input.userId ?? null,
      },
    });

    await tx.stockLevel.upsert({
      where: key,
      create: {
        productId: input.productId,
        branchId: warehouse.branchId,
        warehouseId: input.warehouseId,
        quantity: balanceAfter,
      },
      update: { quantity: balanceAfter },
    });

    return movement;
  }

  // ── GET /inventory/stock ──────────────────────────────────
  /**
   * Umbral global de stock bajo (Ajustes → Inventario). Se aplica a los
   * productos sin punto de reorden propio. Por defecto 5.
   */
  async getLowStockThreshold(): Promise<number> {
    const setting = await this.prisma.setting.findFirst({
      where: {
        scope: 'global',
        branchId: null,
        key: 'inventory.lowStockThreshold',
      },
    });
    const value = setting?.valueJson;
    return typeof value === 'number' && value >= 0 ? value : 5;
  }

  async getStock(query: StockQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;
    const lowStockThreshold = await this.getLowStockThreshold();

    const where: Prisma.StockLevelWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.productId) where.productId = query.productId;
    if (query.search) {
      where.product = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { sku: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    // Low-stock compares two columns, which Prisma cannot express in `where`;
    // resolve it in memory (this view targets a manageable result set).
    if (query.lowStock === 'true') {
      const all = await this.prisma.stockLevel.findMany({
        where,
        include: stockInclude,
        orderBy: { product: { name: 'asc' } },
      });
      const low = all
        .map((s) => mapStockLevel(s, lowStockThreshold))
        .filter((s) => s.lowStock);
      return {
        data: low.slice(skip, skip + limit),
        meta: { page, limit, total: low.length },
      };
    }

    const [levels, total] = await Promise.all([
      this.prisma.stockLevel.findMany({
        where,
        include: stockInclude,
        skip,
        take: limit,
        orderBy: { product: { name: 'asc' } },
      }),
      this.prisma.stockLevel.count({ where }),
    ]);

    return {
      data: levels.map((l) => mapStockLevel(l, lowStockThreshold)),
      meta: { page, limit, total },
    };
  }

  // ── GET /inventory/movements ──────────────────────────────
  async getMovements(query: MovementsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {};
    if (query.productId) where.productId = query.productId;
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements.map(mapMovement),
      meta: { page, limit, total },
    };
  }

  // ── POST /inventory/adjustments ───────────────────────────
  async adjustStock(dto: AdjustStockDto, userId?: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new BadRequestException(
        `El producto con id ${dto.productId} no existe`,
      );
    }

    const movement = await this.prisma.$transaction(async (tx) => {
      const level = await tx.stockLevel.findUnique({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.warehouseId,
          },
        },
      });
      const current = level ? level.quantity : new Prisma.Decimal(0);
      const delta = new Prisma.Decimal(dto.newQuantity).minus(current);

      return this.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.warehouseId,
        type: 'ADJUSTMENT',
        quantity: delta,
        note: dto.reason ?? 'Ajuste de inventario',
        userId,
      });
    });

    return { data: mapMovementBare(movement), meta: {} };
  }

  // ── POST /inventory/transfers ─────────────────────────────
  async transferStock(dto: TransferStockDto, userId?: number) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException(
        'El almacén de origen y destino deben ser distintos',
      );
    }
    if (dto.quantity <= 0) {
      throw new BadRequestException(
        'La cantidad a traspasar debe ser mayor a 0',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new BadRequestException(
        `El producto con id ${dto.productId} no existe`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const out = await this.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.fromWarehouseId,
        type: 'TRANSFER_OUT',
        quantity: -dto.quantity,
        note: dto.note ?? 'Traspaso entre almacenes',
        userId,
      });
      const into = await this.applyMovement(tx, {
        productId: dto.productId,
        warehouseId: dto.toWarehouseId,
        type: 'TRANSFER_IN',
        quantity: dto.quantity,
        note: dto.note ?? 'Traspaso entre almacenes',
        userId,
      });
      return { out, into };
    });

    return {
      data: {
        out: mapMovementBare(result.out),
        into: mapMovementBare(result.into),
      },
      meta: {},
    };
  }

  // ── PUT /inventory/reorder-point ──────────────────────────
  async setReorderPoint(dto: SetReorderPointDto) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new BadRequestException(
        `El almacén con id ${dto.warehouseId} no existe`,
      );
    }
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new BadRequestException(
        `El producto con id ${dto.productId} no existe`,
      );
    }

    const level = await this.prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: dto.productId,
          warehouseId: dto.warehouseId,
        },
      },
      create: {
        productId: dto.productId,
        branchId: warehouse.branchId,
        warehouseId: dto.warehouseId,
        quantity: 0,
        reorderPoint: dto.reorderPoint,
      },
      update: { reorderPoint: dto.reorderPoint },
      include: stockInclude,
    });

    const lowStockThreshold = await this.getLowStockThreshold();
    return { data: mapStockLevel(level, lowStockThreshold), meta: {} };
  }
}

/** Lightweight movement shape for write-endpoint responses. */
function mapMovementBare(m: {
  id: number;
  type: string;
  quantity: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  productId: number;
  warehouseId: number;
  createdAt: Date;
}) {
  return {
    id: m.id,
    type: m.type,
    quantity: Number(m.quantity),
    balanceAfter: Number(m.balanceAfter),
    productId: m.productId,
    warehouseId: m.warehouseId,
    createdAt: m.createdAt,
  };
}
