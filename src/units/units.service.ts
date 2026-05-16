import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Unit } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUnitDto, PaginationQueryDto, UpdateUnitDto } from './dto';

function mapUnit(u: Unit) {
  return {
    id: u.id,
    name: u.name,
    abbreviation: u.abbreviation,
    allowsDecimal: u.allowsDecimal,
  };
}

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUnits(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              abbreviation: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    const [units, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      data: units.map(mapUnit),
      meta: { page, limit, total },
    };
  }

  async createUnit(dto: CreateUnitDto) {
    const existing = await this.prisma.unit.findFirst({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una unidad con el nombre "${dto.name}"`,
      );
    }

    const unit = await this.prisma.unit.create({
      data: {
        name: dto.name,
        abbreviation: dto.abbreviation,
        allowsDecimal: dto.allowsDecimal ?? false,
      },
    });

    return { data: mapUnit(unit), meta: {} };
  }

  async updateUnit(id: number, dto: UpdateUnitDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      throw new NotFoundException(`Unidad con id ${id} no encontrada`);
    }

    if (dto.name && dto.name !== unit.name) {
      const conflict = await this.prisma.unit.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe una unidad con el nombre "${dto.name}"`,
        );
      }
    }

    const updated = await this.prisma.unit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.abbreviation !== undefined && {
          abbreviation: dto.abbreviation,
        }),
        ...(dto.allowsDecimal !== undefined && {
          allowsDecimal: dto.allowsDecimal,
        }),
      },
    });

    return { data: mapUnit(updated), meta: {} };
  }
}
