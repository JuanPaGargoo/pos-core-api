import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeStatusDto,
  CreatePaymentMethodDto,
  PaginationQueryDto,
  UpdatePaymentMethodDto,
} from './dto';

function mapPaymentMethod(pm: PaymentMethod) {
  return {
    id: pm.id,
    name: pm.name,
    type: pm.type,
    requiresReference: pm.requiresReference,
    isActive: pm.isActive,
  };
}

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /payment-methods — list with pagination
  // ──────────────────────────────────────────────
  async getPaymentMethods(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [paymentMethods, total] = await Promise.all([
      this.prisma.paymentMethod.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.paymentMethod.count(),
    ]);

    return {
      data: paymentMethods.map(mapPaymentMethod),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // POST /payment-methods — create
  // ──────────────────────────────────────────────
  async createPaymentMethod(dto: CreatePaymentMethodDto) {
    const existing = await this.prisma.paymentMethod.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un método de pago con el nombre "${dto.name}"`,
      );
    }

    const pm = await this.prisma.paymentMethod.create({
      data: {
        name: dto.name,
        type: dto.type,
        requiresReference: dto.requiresReference ?? false,
        isActive: dto.isActive ?? true,
      },
    });

    return { data: mapPaymentMethod(pm), meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /payment-methods/:id — update
  // ──────────────────────────────────────────────
  async updatePaymentMethod(id: number, dto: UpdatePaymentMethodDto) {
    const pm = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!pm) {
      throw new NotFoundException(`Método de pago con id ${id} no encontrado`);
    }

    if (dto.name && dto.name !== pm.name) {
      const conflict = await this.prisma.paymentMethod.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe un método de pago con el nombre "${dto.name}"`,
        );
      }
    }

    const updated = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.requiresReference !== undefined && {
          requiresReference: dto.requiresReference,
        }),
      },
    });

    return { data: mapPaymentMethod(updated), meta: {} };
  }

  // ──────────────────────────────────────────────
  // PATCH /payment-methods/:id/status — toggle active
  // ──────────────────────────────────────────────
  async changeStatus(id: number, dto: ChangeStatusDto) {
    const pm = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!pm) {
      throw new NotFoundException(`Método de pago con id ${id} no encontrado`);
    }

    const updated = await this.prisma.paymentMethod.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return { data: mapPaymentMethod(updated), meta: {} };
  }
}
