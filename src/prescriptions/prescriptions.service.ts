import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePrescriptionStatusDto,
  CreatePrescriptionDto,
  PaginationQueryDto,
} from './dto';

const prescriptionInclude = {
  doctor: {
    select: { id: true, name: true, license: true, specialty: true },
  },
  customer: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          controlledGroup: true,
        },
      },
    },
  },
} satisfies Prisma.PrescriptionInclude;

type PrescriptionWithRelations = Prisma.PrescriptionGetPayload<{
  include: typeof prescriptionInclude;
}>;

function mapPrescription(p: PrescriptionWithRelations) {
  return {
    id: p.id,
    folio: p.folio,
    branchId: p.branchId,
    doctorId: p.doctorId,
    doctor: p.doctor,
    customerId: p.customerId,
    customer: p.customer,
    patientName: p.patientName,
    diagnosis: p.diagnosis,
    notes: p.notes,
    issuedAt: p.issuedAt,
    status: p.status,
    saleId: p.saleId,
    userId: p.userId,
    user: p.user,
    createdAt: p.createdAt,
    items: p.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productSku: i.product.sku,
      controlledGroup: i.product.controlledGroup,
      quantity: Number(i.quantity),
      dosage: i.dosage,
    })),
  };
}

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── GET /prescriptions ────────────────────────────────────
  async getPrescriptions(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.PrescriptionWhereInput = {};
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { folio: { contains: query.search, mode: 'insensitive' } },
        { patientName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.from || query.to) {
      where.issuedAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const [prescriptions, total] = await Promise.all([
      this.prisma.prescription.findMany({
        where,
        include: prescriptionInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.prescription.count({ where }),
    ]);

    return {
      data: prescriptions.map(mapPrescription),
      meta: { page, limit, total },
    };
  }

  // ── GET /prescriptions/:id ────────────────────────────────
  async getPrescriptionById(id: number) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: prescriptionInclude,
    });
    if (!prescription) {
      throw new NotFoundException(`Receta con id ${id} no encontrada`);
    }
    return { data: mapPrescription(prescription), meta: {} };
  }

  // ── POST /prescriptions ───────────────────────────────────
  async createPrescription(dto: CreatePrescriptionDto, userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new BadRequestException(
        `El médico con id ${dto.doctorId} no existe`,
      );
    }
    if (!doctor.isActive) {
      throw new BadRequestException('El médico está inactivo');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException('Una o más productos recetados no existen');
    }

    const duplicate = await this.prisma.prescription.findFirst({
      where: { folio: dto.folio, branchId: dto.branchId },
    });
    if (duplicate) {
      throw new ConflictException(
        `Ya existe una receta con el folio "${dto.folio}"`,
      );
    }

    const created = await this.prisma.prescription.create({
      data: {
        folio: dto.folio,
        branchId: dto.branchId,
        doctorId: dto.doctorId,
        customerId: dto.customerId ?? null,
        patientName: dto.patientName ?? null,
        diagnosis: dto.diagnosis ?? null,
        notes: dto.notes ?? null,
        issuedAt: new Date(dto.issuedAt),
        userId,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            dosage: i.dosage ?? null,
          })),
        },
      },
      include: prescriptionInclude,
    });

    return { data: mapPrescription(created), meta: {} };
  }

  // ── PATCH /prescriptions/:id/status ───────────────────────
  async changeStatus(id: number, dto: ChangePrescriptionStatusDto) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
    });
    if (!prescription) {
      throw new NotFoundException(`Receta con id ${id} no encontrada`);
    }

    const updated = await this.prisma.prescription.update({
      where: { id },
      data: { status: dto.status },
      include: prescriptionInclude,
    });

    return { data: mapPrescription(updated), meta: {} };
  }

  // ── GET /prescriptions/control-log ────────────────────────
  // Libro de control: medicamentos controlados (COFEPRIS) dispensados.
  async getControlLog(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const prescriptionWhere: Prisma.PrescriptionWhereInput = {
      status: { not: 'CANCELLED' },
    };
    if (query.from || query.to) {
      prescriptionWhere.issuedAt = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const where: Prisma.PrescriptionItemWhereInput = {
      product: { controlledGroup: { not: null } },
      prescription: prescriptionWhere,
    };

    const [items, total] = await Promise.all([
      this.prisma.prescriptionItem.findMany({
        where,
        include: {
          product: {
            select: { name: true, sku: true, controlledGroup: true },
          },
          prescription: {
            include: {
              doctor: { select: { name: true, license: true } },
              customer: { select: { name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.prescriptionItem.count({ where }),
    ]);

    const data = items.map((i) => ({
      id: i.id,
      issuedAt: i.prescription.issuedAt,
      prescriptionFolio: i.prescription.folio,
      productName: i.product.name,
      productSku: i.product.sku,
      controlledGroup: i.product.controlledGroup,
      quantity: Number(i.quantity),
      dosage: i.dosage,
      doctorName: i.prescription.doctor.name,
      doctorLicense: i.prescription.doctor.license,
      patientName:
        i.prescription.customer?.name ?? i.prescription.patientName ?? null,
    }));

    return { data, meta: { page, limit, total } };
  }
}
