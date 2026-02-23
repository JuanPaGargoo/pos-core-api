import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Warehouse } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateWarehouseDto,
  PaginationQueryDto,
  UpdateWarehouseDto,
} from './dto';

export interface AuditContext {
  userId?: number;
  ip?: string;
  userAgent?: string;
}

function mapWarehouse(w: Warehouse) {
  return {
    id: w.id,
    branchId: w.branchId,
    name: w.name,
    code: w.code,
    isActive: w.isActive,
  };
}

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /warehouses — list warehouses (optionally filtered by branchId)
  // ──────────────────────────────────────────────
  async getWarehouses(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = query.branchId ? { branchId: query.branchId } : {};

    const [warehouses, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return {
      data: warehouses.map(mapWarehouse),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // POST /warehouses — create warehouse
  // ──────────────────────────────────────────────
  async createWarehouse(dto: CreateWarehouseDto, ctx: AuditContext) {
    // Validate branch exists
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(
        `Sucursal con id ${dto.branchId} no encontrada`,
      );
    }

    // Validate code uniqueness within the branch
    const existing = await this.prisma.warehouse.findFirst({
      where: { code: dto.code, branchId: dto.branchId },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un almacén con el código "${dto.code}" en esta sucursal`,
      );
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        branchId: dto.branchId,
        name: dto.name,
        code: dto.code,
        isActive: dto.isActive ?? true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        branchId: warehouse.branchId,
        action: 'CREATE',
        entity: 'Warehouse',
        entityId: warehouse.id,
        message: `Almacén "${warehouse.name}" (${warehouse.code}) creado en sucursal ${warehouse.branchId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: {
          branchId: warehouse.branchId,
          name: warehouse.name,
          code: warehouse.code,
        },
      },
    });

    return { data: mapWarehouse(warehouse), meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /warehouses/:id — update warehouse
  // ──────────────────────────────────────────────
  async updateWarehouse(
    id: number,
    dto: UpdateWarehouseDto,
    ctx: AuditContext,
  ) {
    const warehouse = await this.prisma.warehouse.findUnique({ where: { id } });

    if (!warehouse) {
      throw new NotFoundException(`Almacén con id ${id} no encontrado`);
    }

    // Check code uniqueness within the same branch if changing code
    if (dto.code && dto.code !== warehouse.code) {
      const conflict = await this.prisma.warehouse.findFirst({
        where: { code: dto.code, branchId: warehouse.branchId, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe un almacén con el código "${dto.code}" en esta sucursal`,
        );
      }
    }

    const updated = await this.prisma.warehouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        branchId: updated.branchId,
        action: 'UPDATE',
        entity: 'Warehouse',
        entityId: updated.id,
        message: `Almacén "${updated.name}" (${updated.code}) actualizado`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: { ...dto },
      },
    });

    return { data: mapWarehouse(updated), meta: {} };
  }
}
