import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Location } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLocationDto,
  PaginationQueryDto,
  UpdateLocationDto,
} from './dto';

export interface AuditContext {
  userId?: number;
  ip?: string;
  userAgent?: string;
}

function mapLocation(l: Location) {
  return {
    id: l.id,
    warehouseId: l.warehouseId,
    name: l.name,
    code: l.code,
    type: l.type,
    parentId: l.parentId,
    isActive: l.isActive,
  };
}

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /locations — list locations (optionally filtered by warehouseId / parentId)
  // ──────────────────────────────────────────────
  async getLocations(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.warehouseId) where.warehouseId = query.warehouseId;
    if (query.parentId !== undefined) where.parentId = query.parentId;

    const [locations, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.location.count({ where }),
    ]);

    return {
      data: locations.map(mapLocation),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // POST /locations — create location
  // ──────────────────────────────────────────────
  async createLocation(dto: CreateLocationDto, ctx: AuditContext) {
    // Validate warehouse exists
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(
        `Almacén con id ${dto.warehouseId} no encontrado`,
      );
    }

    // Validate code uniqueness (code is globally unique in schema)
    const existing = await this.prisma.location.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una ubicación con el código "${dto.code}"`,
      );
    }

    // Validate parent exists and belongs to the same warehouse
    if (dto.parentId !== undefined) {
      const parent = await this.prisma.location.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Ubicación padre con id ${dto.parentId} no encontrada`,
        );
      }
      if (parent.warehouseId !== dto.warehouseId) {
        throw new BadRequestException(
          'La ubicación padre debe pertenecer al mismo almacén',
        );
      }
    }

    const location = await this.prisma.location.create({
      data: {
        warehouseId: dto.warehouseId,
        name: dto.name,
        code: dto.code,
        type: dto.type,
        parentId: dto.parentId ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'CREATE',
        entity: 'Location',
        entityId: location.id,
        message: `Ubicación "${location.name}" (${location.code}) creada en almacén ${location.warehouseId}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: {
          warehouseId: location.warehouseId,
          name: location.name,
          code: location.code,
          type: location.type,
          parentId: location.parentId,
        },
      },
    });

    return { data: mapLocation(location), meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /locations/:id — update location
  // ──────────────────────────────────────────────
  async updateLocation(id: number, dto: UpdateLocationDto, ctx: AuditContext) {
    const location = await this.prisma.location.findUnique({ where: { id } });
    if (!location) {
      throw new NotFoundException(`Ubicación con id ${id} no encontrada`);
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== location.code) {
      const conflict = await this.prisma.location.findUnique({
        where: { code: dto.code },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe una ubicación con el código "${dto.code}"`,
        );
      }
    }

    // Validate new parent if provided
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          'Una ubicación no puede ser su propio padre',
        );
      }
      const parent = await this.prisma.location.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(
          `Ubicación padre con id ${dto.parentId} no encontrada`,
        );
      }
      if (parent.warehouseId !== location.warehouseId) {
        throw new BadRequestException(
          'La ubicación padre debe pertenecer al mismo almacén',
        );
      }
    }

    const updated = await this.prisma.location.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...('parentId' in dto && { parentId: dto.parentId ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'Location',
        entityId: updated.id,
        message: `Ubicación "${updated.name}" (${updated.code}) actualizada`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: { ...dto },
      },
    });

    return { data: mapLocation(updated), meta: {} };
  }
}
