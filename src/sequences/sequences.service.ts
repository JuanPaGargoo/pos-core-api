import { Injectable, NotFoundException } from '@nestjs/common';
import { Sequence } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto, UpdateSequenceDto } from './dto';

export interface AuditContext {
  userId?: number;
  ip?: string;
  userAgent?: string;
}

interface SequenceRow {
  id: number;
  prefix: string;
  next_number: number;
  padding: number;
}

function mapSequence(s: Sequence) {
  return {
    id: s.id,
    branchId: s.branchId,
    key: s.key,
    prefix: s.prefix,
    nextNumber: s.nextNumber,
    padding: s.padding,
  };
}

@Injectable()
export class SequencesService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /sequences — list sequences with optional branchId filter
  // ──────────────────────────────────────────────
  async getSequences(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = query.branchId ? { branchId: query.branchId } : {};

    const [sequences, total] = await Promise.all([
      this.prisma.sequence.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ branchId: 'asc' }, { key: 'asc' }],
      }),
      this.prisma.sequence.count({ where }),
    ]);

    return {
      data: sequences.map(mapSequence),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // PUT /sequences/:id — update sequence config
  // ──────────────────────────────────────────────
  async updateSequence(id: number, dto: UpdateSequenceDto, ctx: AuditContext) {
    const sequence = await this.prisma.sequence.findUnique({ where: { id } });
    if (!sequence) {
      throw new NotFoundException(`Secuencia con id ${id} no encontrada`);
    }

    const updated = await this.prisma.sequence.update({
      where: { id },
      data: {
        ...(dto.prefix !== undefined && { prefix: dto.prefix }),
        ...(dto.nextNumber !== undefined && { nextNumber: dto.nextNumber }),
        ...(dto.padding !== undefined && { padding: dto.padding }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        branchId: updated.branchId,
        action: 'UPDATE',
        entity: 'Sequence',
        entityId: updated.id,
        message: `Secuencia "${updated.key}" de sucursal ${updated.branchId} actualizada`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: { ...dto },
      },
    });

    return { data: mapSequence(updated), meta: {} };
  }

  // ──────────────────────────────────────────────
  // getNextNumber — transactional SELECT FOR UPDATE
  //
  // Locks the sequence row, reads the current next_number, increments it,
  // and returns the formatted folio: prefix + zero-padded number.
  // Safe for concurrent usage — no two callers will get the same number.
  // ──────────────────────────────────────────────
  async getNextNumber(branchId: number, key: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the row with SELECT FOR UPDATE to prevent concurrent collisions
      const rows = await tx.$queryRaw<SequenceRow[]>`
        SELECT id, prefix, next_number, padding
        FROM sequences
        WHERE branch_id = ${branchId} AND key = ${key}
        FOR UPDATE
      `;

      if (rows.length === 0) {
        throw new NotFoundException(
          `Secuencia "${key}" para sucursal ${branchId} no encontrada`,
        );
      }

      const seq = rows[0];
      const currentNumber = Number(seq.next_number);

      // Increment next_number
      await tx.$executeRaw`
        UPDATE sequences
        SET next_number = next_number + 1
        WHERE id = ${seq.id}
      `;

      // Format: prefix + zero-padded number
      const padded = String(currentNumber).padStart(Number(seq.padding), '0');
      return `${seq.prefix}${padded}`;
    });
  }
}
