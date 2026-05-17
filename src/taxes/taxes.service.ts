import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Tax } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeTaxStatusDto,
  CreateTaxDto,
  PaginationQueryDto,
  UpdateTaxDto,
} from './dto';

function mapTax(t: Tax) {
  return {
    id: t.id,
    name: t.name,
    rate: Number(t.rate),
    isIncluded: t.isIncluded,
    isActive: t.isActive,
  };
}

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTaxes(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [taxes, total] = await Promise.all([
      this.prisma.tax.findMany({ skip, take: limit, orderBy: { id: 'asc' } }),
      this.prisma.tax.count(),
    ]);

    return { data: taxes.map(mapTax), meta: { page, limit, total } };
  }

  async createTax(dto: CreateTaxDto) {
    const existing = await this.prisma.tax.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un impuesto con el nombre "${dto.name}"`,
      );
    }

    const tax = await this.prisma.tax.create({
      data: {
        name: dto.name,
        rate: dto.rate,
        isIncluded: dto.isIncluded ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    return { data: mapTax(tax), meta: {} };
  }

  async updateTax(id: number, dto: UpdateTaxDto) {
    const tax = await this.prisma.tax.findUnique({ where: { id } });
    if (!tax) {
      throw new NotFoundException(`Impuesto con id ${id} no encontrado`);
    }

    if (dto.name && dto.name !== tax.name) {
      const conflict = await this.prisma.tax.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe un impuesto con el nombre "${dto.name}"`,
        );
      }
    }

    const updated = await this.prisma.tax.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.rate !== undefined && { rate: dto.rate }),
        ...(dto.isIncluded !== undefined && { isIncluded: dto.isIncluded }),
      },
    });

    return { data: mapTax(updated), meta: {} };
  }

  async changeStatus(id: number, dto: ChangeTaxStatusDto) {
    const tax = await this.prisma.tax.findUnique({ where: { id } });
    if (!tax) {
      throw new NotFoundException(`Impuesto con id ${id} no encontrado`);
    }

    const updated = await this.prisma.tax.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return { data: mapTax(updated), meta: {} };
  }
}
