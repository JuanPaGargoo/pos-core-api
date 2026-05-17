import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogsDto } from './dto';

export interface LogPayload {
  userId?: number;
  branchId?: number;
  action: string;
  entity: string;
  entityId?: number;
  message: string;
  ip?: string;
  userAgent?: string;
  payload?: unknown;
}

const logInclude = {
  user: { select: { id: true, name: true } },
} satisfies Prisma.AuditLogInclude;

type LogWithUser = Prisma.AuditLogGetPayload<{ include: typeof logInclude }>;

function mapLog(log: LogWithUser) {
  return {
    id: log.id,
    createdAt: log.createdAt,
    userId: log.userId,
    user: log.user,
    branchId: log.branchId,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    message: log.message,
    ip: log.ip,
    userAgent: log.userAgent,
    payloadJson: log.payloadJson,
  };
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // Shared log() method — callable from any module
  // ──────────────────────────────────────────────
  async log(data: LogPayload): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        branchId: data.branchId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        message: data.message,
        ip: data.ip,
        userAgent: data.userAgent,
        payloadJson: (data.payload as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  // ──────────────────────────────────────────────
  // GET /audit-logs — paginated list with filters
  // ──────────────────────────────────────────────
  async getLogs(query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.action) where.action = query.action;
    if (query.entity) where.entity = query.entity;
    if (query.entityId) where.entityId = query.entityId;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: logInclude,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs.map(mapLog),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // GET /audit-logs/:id — get single log detail
  // ──────────────────────────────────────────────
  async getLogById(id: number) {
    const log = await this.prisma.auditLog.findUnique({
      where: { id },
      include: logInclude,
    });
    if (!log) {
      throw new NotFoundException(`AuditLog con id ${id} no encontrado`);
    }
    return { data: mapLog(log), meta: {} };
  }
}
