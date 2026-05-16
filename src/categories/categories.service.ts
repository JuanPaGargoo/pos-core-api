import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeCategoryStatusDto,
  CreateCategoryDto,
  PaginationQueryDto,
  UpdateCategoryDto,
} from './dto';

const include = {
  parent: { select: { id: true, name: true } },
  _count: { select: { products: true } },
} satisfies Prisma.CategoryInclude;

type CategoryWithRelations = Prisma.CategoryGetPayload<{
  include: typeof include;
}>;

function mapCategory(c: CategoryWithRelations) {
  return {
    id: c.id,
    name: c.name,
    parentId: c.parentId,
    parent: c.parent ? { id: c.parent.id, name: c.parent.name } : null,
    isActive: c.isActive,
    productCount: c._count.products,
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.CategoryWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [categories, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data: categories.map(mapCategory),
      meta: { page, limit, total },
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    await this.assertNameAvailable(dto.name);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.assertParentExists(dto.parentId);
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        parentId: dto.parentId ?? null,
        isActive: dto.isActive ?? true,
      },
      include,
    });

    return { data: mapCategory(category), meta: {} };
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }

    if (dto.name && dto.name !== category.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException(
          'Una categoría no puede ser su propia categoría padre',
        );
      }
      await this.assertParentExists(dto.parentId);
      await this.assertNoCycle(id, dto.parentId);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include,
    });

    return { data: mapCategory(updated), meta: {} };
  }

  async changeStatus(id: number, dto: ChangeCategoryStatusDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Categoría con id ${id} no encontrada`);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive: dto.isActive },
      include,
    });

    return { data: mapCategory(updated), meta: {} };
  }

  // ── helpers ───────────────────────────────────────────────
  private async assertNameAvailable(name: string, excludeId?: number) {
    const conflict = await this.prisma.category.findFirst({
      where: { name, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    });
    if (conflict) {
      throw new ConflictException(
        `Ya existe una categoría con el nombre "${name}"`,
      );
    }
  }

  private async assertParentExists(parentId: number) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new BadRequestException(
        `La categoría padre con id ${parentId} no existe`,
      );
    }
  }

  /** Walks up from `parentId`; if it reaches `categoryId` the move forms a cycle. */
  private async assertNoCycle(categoryId: number, parentId: number) {
    let currentId: number | null = parentId;
    while (currentId !== null) {
      if (currentId === categoryId) {
        throw new BadRequestException(
          'El cambio de categoría padre crearía una jerarquía circular',
        );
      }
      const current: { parentId: number | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      currentId = current?.parentId ?? null;
    }
  }
}
