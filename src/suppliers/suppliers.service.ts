import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Supplier } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeSupplierStatusDto,
  CreateSupplierDto,
  PaginationQueryDto,
  UpdateSupplierDto,
} from './dto';

function mapSupplier(s: Supplier) {
  return {
    id: s.id,
    name: s.name,
    rfc: s.rfc,
    contactName: s.contactName,
    phone: s.phone,
    email: s.email,
    isActive: s.isActive,
  };
}

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuppliers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { rfc: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data: suppliers.map(mapSupplier),
      meta: { page, limit, total },
    };
  }

  async createSupplier(dto: CreateSupplierDto) {
    await this.assertNameAvailable(dto.name);

    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        rfc: dto.rfc ?? null,
        contactName: dto.contactName ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return { data: mapSupplier(supplier), meta: {} };
  }

  async updateSupplier(id: number, dto: UpdateSupplierDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con id ${id} no encontrado`);
    }

    if (dto.name && dto.name !== supplier.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.rfc !== undefined && { rfc: dto.rfc }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });

    return { data: mapSupplier(updated), meta: {} };
  }

  async changeStatus(id: number, dto: ChangeSupplierStatusDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Proveedor con id ${id} no encontrado`);
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return { data: mapSupplier(updated), meta: {} };
  }

  private async assertNameAvailable(name: string, excludeId?: number) {
    const conflict = await this.prisma.supplier.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (conflict) {
      throw new ConflictException(
        `Ya existe un proveedor con el nombre "${name}"`,
      );
    }
  }
}
