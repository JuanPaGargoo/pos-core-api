import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeCustomerStatusDto,
  CreateCustomerDto,
  PaginationQueryDto,
  RegisterPaymentDto,
  UpdateCustomerDto,
} from './dto';

const customerInclude = {
  priceList: { select: { id: true, name: true } },
} satisfies Prisma.CustomerInclude;

type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerInclude;
}>;

function mapCustomer(c: CustomerWithRelations) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    rfc: c.rfc,
    fiscalRegime: c.fiscalRegime,
    cfdiUse: c.cfdiUse,
    priceListId: c.priceListId,
    priceList: c.priceList,
    creditEnabled: c.creditEnabled,
    creditLimit: Number(c.creditLimit),
    creditBalance: Number(c.creditBalance),
    loyaltyPoints: c.loyaltyPoints,
    isActive: c.isActive,
    createdAt: c.createdAt,
  };
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /customers ────────────────────────────────────────
  async getCustomers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { rfc: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }
    if (query.creditEnabled !== undefined) {
      where.creditEnabled = query.creditEnabled === 'true';
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: customerInclude,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers.map(mapCustomer),
      meta: { page, limit, total },
    };
  }

  // ── GET /customers/:id ────────────────────────────────────
  async getCustomerById(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: customerInclude,
    });
    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    return { data: mapCustomer(customer), meta: {} };
  }

  // ── POST /customers ───────────────────────────────────────
  async createCustomer(dto: CreateCustomerDto) {
    if (dto.priceListId != null) {
      await this.assertPriceListExists(dto.priceListId);
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        rfc: dto.rfc ?? null,
        fiscalRegime: dto.fiscalRegime ?? null,
        cfdiUse: dto.cfdiUse ?? null,
        priceListId: dto.priceListId ?? null,
        creditEnabled: dto.creditEnabled ?? false,
        creditLimit: dto.creditLimit ?? 0,
        isActive: dto.isActive ?? true,
      },
      include: customerInclude,
    });

    return { data: mapCustomer(customer), meta: {} };
  }

  // ── PUT /customers/:id ────────────────────────────────────
  async updateCustomer(id: number, dto: UpdateCustomerDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }
    if (dto.priceListId != null) {
      await this.assertPriceListExists(dto.priceListId);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.rfc !== undefined && { rfc: dto.rfc }),
        ...(dto.fiscalRegime !== undefined && {
          fiscalRegime: dto.fiscalRegime,
        }),
        ...(dto.cfdiUse !== undefined && { cfdiUse: dto.cfdiUse }),
        ...(dto.priceListId !== undefined && { priceListId: dto.priceListId }),
        ...(dto.creditEnabled !== undefined && {
          creditEnabled: dto.creditEnabled,
        }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
      },
      include: customerInclude,
    });

    return { data: mapCustomer(updated), meta: {} };
  }

  // ── PATCH /customers/:id/status ───────────────────────────
  async changeStatus(id: number, dto: ChangeCustomerStatusDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: customerInclude,
    });

    return { data: mapCustomer(updated), meta: {} };
  }

  // ── GET /customers/:id/credit ─────────────────────────────
  async getCredit(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: customerInclude,
    });
    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    const entries = await this.prisma.customerCreditEntry.findMany({
      where: { customerId: id },
      orderBy: { id: 'desc' },
      take: 100,
    });

    return {
      data: {
        customer: mapCustomer(customer),
        entries: entries.map((e) => ({
          id: e.id,
          type: e.type,
          amount: Number(e.amount),
          balanceAfter: Number(e.balanceAfter),
          refType: e.refType,
          refId: e.refId,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
      meta: {},
    };
  }

  // ── POST /customers/:id/payments ──────────────────────────
  async registerPayment(id: number, dto: RegisterPaymentDto, userId: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Cliente con id ${id} no encontrado`);
    }

    const balance = Number(customer.creditBalance);
    if (dto.amount > balance + 0.001) {
      throw new BadRequestException(
        `El abono (${dto.amount}) supera el saldo del cliente (${balance})`,
      );
    }

    const branchId = await this.resolveBranchId(userId);

    const result = await this.prisma.$transaction(async (tx) => {
      const newBalance = Math.round((balance - dto.amount) * 100) / 100;
      const entry = await tx.customerCreditEntry.create({
        data: {
          customerId: id,
          branchId,
          type: 'PAYMENT',
          amount: -dto.amount,
          balanceAfter: newBalance,
          refType: 'Payment',
          paymentMethodId: dto.paymentMethodId ?? null,
          note: dto.note ?? 'Abono a cuenta',
          userId,
        },
      });
      const updated = await tx.customer.update({
        where: { id },
        data: { creditBalance: newBalance },
        include: customerInclude,
      });
      return { entry, updated };
    });

    return {
      data: {
        customer: mapCustomer(result.updated),
        entry: {
          id: result.entry.id,
          type: result.entry.type,
          amount: Number(result.entry.amount),
          balanceAfter: Number(result.entry.balanceAfter),
          createdAt: result.entry.createdAt,
        },
      },
      meta: {},
    };
  }

  // ── helpers ───────────────────────────────────────────────
  private async assertPriceListExists(priceListId: number) {
    const list = await this.prisma.priceList.findUnique({
      where: { id: priceListId },
    });
    if (!list) {
      throw new BadRequestException(
        `La lista de precios con id ${priceListId} no existe`,
      );
    }
  }

  /** Resolve the branch where a user operates (their default branch). */
  private async resolveBranchId(userId: number): Promise<number> {
    const userBranch = await this.prisma.userBranch.findFirst({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
    if (!userBranch) {
      throw new ConflictException('El usuario no tiene una sucursal asignada');
    }
    return userBranch.branchId;
  }
}
