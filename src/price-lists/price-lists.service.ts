import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PriceList } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePriceListStatusDto,
  CreatePriceListDto,
  PaginationQueryDto,
  UpdatePriceListDto,
} from './dto';

function mapPriceList(pl: PriceList) {
  return {
    id: pl.id,
    name: pl.name,
    isDefault: pl.isDefault,
    isActive: pl.isActive,
  };
}

@Injectable()
export class PriceListsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPriceLists(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = query.search
      ? { name: { contains: query.search, mode: 'insensitive' as const } }
      : {};

    const [priceLists, total] = await Promise.all([
      this.prisma.priceList.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.priceList.count({ where }),
    ]);

    return {
      data: priceLists.map(mapPriceList),
      meta: { page, limit, total },
    };
  }

  async createPriceList(dto: CreatePriceListDto) {
    await this.assertNameAvailable(dto.name);

    const priceList = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.priceList.updateMany({ data: { isDefault: false } });
      }
      return tx.priceList.create({
        data: {
          name: dto.name,
          isDefault: dto.isDefault ?? false,
          isActive: dto.isActive ?? true,
        },
      });
    });

    return { data: mapPriceList(priceList), meta: {} };
  }

  async updatePriceList(id: number, dto: UpdatePriceListDto) {
    const priceList = await this.prisma.priceList.findUnique({ where: { id } });
    if (!priceList) {
      throw new NotFoundException(
        `Lista de precios con id ${id} no encontrada`,
      );
    }

    if (dto.name && dto.name !== priceList.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.priceList.updateMany({
          where: { NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.priceList.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        },
      });
    });

    return { data: mapPriceList(updated), meta: {} };
  }

  async changeStatus(id: number, dto: ChangePriceListStatusDto) {
    const priceList = await this.prisma.priceList.findUnique({ where: { id } });
    if (!priceList) {
      throw new NotFoundException(
        `Lista de precios con id ${id} no encontrada`,
      );
    }

    const updated = await this.prisma.priceList.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return { data: mapPriceList(updated), meta: {} };
  }

  private async assertNameAvailable(name: string, excludeId?: number) {
    const conflict = await this.prisma.priceList.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (conflict) {
      throw new ConflictException(
        `Ya existe una lista de precios con el nombre "${name}"`,
      );
    }
  }
}
