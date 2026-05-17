import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import {
  CashMovementDto,
  CloseSessionDto,
  OpenSessionDto,
  PaginationQueryDto,
} from './dto';

type SessionWithUser = Prisma.CashSessionGetPayload<{
  include: { user: { select: { id: true; name: true } } };
}>;

const dec = (v: Prisma.Decimal | null): number | null =>
  v === null ? null : Number(v);

function mapSession(s: SessionWithUser) {
  return {
    id: s.id,
    folio: s.folio,
    branchId: s.branchId,
    userId: s.userId,
    user: s.user,
    openingAmount: Number(s.openingAmount),
    closingAmount: dec(s.closingAmount),
    expectedAmount: dec(s.expectedAmount),
    difference: dec(s.difference),
    status: s.status,
    openedAt: s.openedAt,
    closedAt: s.closedAt,
  };
}

const sessionInclude = {
  user: { select: { id: true, name: true } },
} satisfies Prisma.CashSessionInclude;

@Injectable()
export class CashSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequences: SequencesService,
  ) {}

  // ── GET /cash-sessions ────────────────────────────────────
  async getCashSessions(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.CashSessionWhereInput = {};
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { folio: { contains: query.search, mode: 'insensitive' } },
        { user: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [sessions, total] = await Promise.all([
      this.prisma.cashSession.findMany({
        where,
        include: sessionInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.cashSession.count({ where }),
    ]);

    return {
      data: sessions.map(mapSession),
      meta: { page, limit, total },
    };
  }

  // ── GET /cash-sessions/current ────────────────────────────
  async getCurrent(branchId: number, userId: number) {
    const session = await this.prisma.cashSession.findFirst({
      where: { branchId, userId, status: 'OPEN' },
      include: sessionInclude,
    });
    return { data: session ? mapSession(session) : null, meta: {} };
  }

  // ── POST /cash-sessions/open ──────────────────────────────
  async openSession(dto: OpenSessionDto, userId: number) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new BadRequestException(
        `La sucursal con id ${dto.branchId} no existe`,
      );
    }

    const open = await this.prisma.cashSession.findFirst({
      where: { branchId: dto.branchId, userId, status: 'OPEN' },
    });
    if (open) {
      throw new ConflictException(
        'Ya tienes una caja abierta en esta sucursal',
      );
    }

    const folio = await this.sequences.getNextNumber(
      dto.branchId,
      'cash_session',
    );

    const session = await this.prisma.cashSession.create({
      data: {
        branchId: dto.branchId,
        userId,
        folio,
        openingAmount: dto.openingAmount,
        status: 'OPEN',
      },
      include: sessionInclude,
    });

    return { data: mapSession(session), meta: {} };
  }

  // ── POST /cash-sessions/:id/close ─────────────────────────
  async closeSession(id: number, dto: CloseSessionDto) {
    const session = await this.prisma.cashSession.findUnique({ where: { id } });
    if (!session) {
      throw new NotFoundException(`Caja con id ${id} no encontrada`);
    }
    if (session.status === 'CLOSED') {
      throw new ConflictException('La caja ya está cerrada');
    }

    const totals = await this.computeTotals(id, Number(session.openingAmount));
    const difference = dto.closingAmount - totals.expectedCash;

    await this.prisma.cashSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closingAmount: dto.closingAmount,
        expectedAmount: totals.expectedCash,
        difference,
        closedAt: new Date(),
      },
    });

    return this.getReport(id);
  }

  // ── POST /cash-sessions/:id/movements ─────────────────────
  async addMovement(id: number, dto: CashMovementDto, userId: number) {
    const session = await this.prisma.cashSession.findUnique({ where: { id } });
    if (!session) {
      throw new NotFoundException(`Caja con id ${id} no encontrada`);
    }
    if (session.status !== 'OPEN') {
      throw new ConflictException(
        'No se pueden registrar movimientos en una caja cerrada',
      );
    }

    const movement = await this.prisma.cashMovement.create({
      data: {
        cashSessionId: id,
        type: dto.type,
        amount: dto.amount,
        reason: dto.reason,
        userId,
      },
    });

    return {
      data: {
        id: movement.id,
        type: movement.type,
        amount: Number(movement.amount),
        reason: movement.reason,
        createdAt: movement.createdAt,
      },
      meta: {},
    };
  }

  // ── GET /cash-sessions/:id/report ─────────────────────────
  async getReport(id: number) {
    const session = await this.prisma.cashSession.findUnique({
      where: { id },
      include: sessionInclude,
    });
    if (!session) {
      throw new NotFoundException(`Caja con id ${id} no encontrada`);
    }

    const totals = await this.computeTotals(id, Number(session.openingAmount));

    return {
      data: {
        session: mapSession(session),
        ...totals,
      },
      meta: {},
    };
  }

  /**
   * Aggregate sales, payments and cash movements for a session.
   * Expected cash = opening + cash payments − change given + cash in − cash out.
   */
  private async computeTotals(sessionId: number, opening: number) {
    const sales = await this.prisma.sale.findMany({
      where: { cashSessionId: sessionId, status: 'COMPLETED' },
      select: {
        total: true,
        changeGiven: true,
        payments: {
          select: {
            amount: true,
            paymentMethod: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });

    const byMethod = new Map<
      number,
      { id: number; name: string; type: string; total: number }
    >();
    let salesTotal = 0;
    let changeTotal = 0;

    for (const sale of sales) {
      salesTotal += Number(sale.total);
      changeTotal += Number(sale.changeGiven);
      for (const p of sale.payments) {
        const m = p.paymentMethod;
        const entry = byMethod.get(m.id) ?? {
          id: m.id,
          name: m.name,
          type: m.type,
          total: 0,
        };
        entry.total += Number(p.amount);
        byMethod.set(m.id, entry);
      }
    }

    const movements = await this.prisma.cashMovement.findMany({
      where: { cashSessionId: sessionId },
    });
    let cashIn = 0;
    let cashOut = 0;
    for (const mv of movements) {
      if (mv.type === 'IN') cashIn += Number(mv.amount);
      else cashOut += Number(mv.amount);
    }

    const paymentsByMethod = [...byMethod.values()];
    const cashPayments = paymentsByMethod
      .filter((m) => m.type === 'cash')
      .reduce((acc, m) => acc + m.total, 0);

    const round = (n: number) => Math.round(n * 100) / 100;
    const expectedCash = round(
      opening + cashPayments - changeTotal + cashIn - cashOut,
    );

    return {
      opening,
      salesCount: sales.length,
      salesTotal: round(salesTotal),
      changeTotal: round(changeTotal),
      paymentsByMethod: paymentsByMethod.map((m) => ({
        ...m,
        total: round(m.total),
      })),
      cashIn: round(cashIn),
      cashOut: round(cashOut),
      expectedCash,
    };
  }
}
