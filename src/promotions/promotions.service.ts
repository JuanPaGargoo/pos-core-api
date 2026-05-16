import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePromotionStatusDto,
  CreatePromotionDto,
  PaginationQueryDto,
  UpdatePromotionDto,
} from './dto';

const promotionInclude = {
  product: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
} satisfies Prisma.PromotionInclude;

type PromotionWithRelations = Prisma.PromotionGetPayload<{
  include: typeof promotionInclude;
}>;

function mapPromotion(p: PromotionWithRelations) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    value: Number(p.value),
    buyQty: p.buyQty,
    payQty: p.payQty,
    scope: p.scope,
    productId: p.productId,
    product: p.product,
    categoryId: p.categoryId,
    category: p.category,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    isActive: p.isActive,
  };
}

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPromotions(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.PromotionWhereInput = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        include: promotionInclude,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return {
      data: promotions.map(mapPromotion),
      meta: { page, limit, total },
    };
  }

  /** Promotions currently in effect — used by the POS to price the cart. */
  async getActive() {
    const now = new Date();
    const promotions = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      include: promotionInclude,
      orderBy: { id: 'asc' },
    });

    return { data: promotions.map(mapPromotion), meta: {} };
  }

  async createPromotion(dto: CreatePromotionDto) {
    await this.validate(dto);

    const promotion = await this.prisma.promotion.create({
      data: {
        name: dto.name,
        type: dto.type,
        value: dto.value ?? 0,
        buyQty: dto.buyQty ?? null,
        payQty: dto.payQty ?? null,
        scope: dto.scope,
        productId: dto.scope === 'PRODUCT' ? (dto.productId ?? null) : null,
        categoryId: dto.scope === 'CATEGORY' ? (dto.categoryId ?? null) : null,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
      include: promotionInclude,
    });

    return { data: mapPromotion(promotion), meta: {} };
  }

  async updatePromotion(id: number, dto: UpdatePromotionDto) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promoción con id ${id} no encontrada`);
    }

    const merged = {
      type: dto.type ?? promotion.type,
      scope: dto.scope ?? promotion.scope,
      buyQty: dto.buyQty ?? promotion.buyQty ?? undefined,
      payQty: dto.payQty ?? promotion.payQty ?? undefined,
      productId:
        dto.productId !== undefined
          ? (dto.productId ?? undefined)
          : (promotion.productId ?? undefined),
      categoryId:
        dto.categoryId !== undefined
          ? (dto.categoryId ?? undefined)
          : (promotion.categoryId ?? undefined),
    };
    await this.validate(merged);

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.buyQty !== undefined && { buyQty: dto.buyQty }),
        ...(dto.payQty !== undefined && { payQty: dto.payQty }),
        ...(dto.scope !== undefined && { scope: dto.scope }),
        ...(dto.productId !== undefined && { productId: dto.productId }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.startsAt !== undefined && {
          startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        }),
        ...(dto.endsAt !== undefined && {
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        }),
      },
      include: promotionInclude,
    });

    return { data: mapPromotion(updated), meta: {} };
  }

  async changeStatus(id: number, dto: ChangePromotionStatusDto) {
    const promotion = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promoción con id ${id} no encontrada`);
    }

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: promotionInclude,
    });

    return { data: mapPromotion(updated), meta: {} };
  }

  /** Validate scope target and NxM parameters. */
  private async validate(dto: {
    type: string;
    scope: string;
    buyQty?: number;
    payQty?: number;
    productId?: number;
    categoryId?: number;
  }) {
    if (dto.scope === 'PRODUCT') {
      if (!dto.productId) {
        throw new BadRequestException(
          'Una promoción de producto requiere un producto',
        );
      }
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) {
        throw new BadRequestException(
          `El producto con id ${dto.productId} no existe`,
        );
      }
    }
    if (dto.scope === 'CATEGORY') {
      if (!dto.categoryId) {
        throw new BadRequestException(
          'Una promoción de categoría requiere una categoría',
        );
      }
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new BadRequestException(
          `La categoría con id ${dto.categoryId} no existe`,
        );
      }
    }
    if (dto.type === 'NXM') {
      if (!dto.buyQty || !dto.payQty || dto.buyQty <= dto.payQty) {
        throw new BadRequestException(
          'Una promoción NxM requiere comprar (N) mayor que pagar (M)',
        );
      }
    }
  }
}
