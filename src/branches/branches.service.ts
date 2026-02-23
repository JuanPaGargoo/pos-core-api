import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Branch } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, PaginationQueryDto, UpdateBranchDto } from './dto';

function mapBranch(branch: Branch) {
  return {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone,
    timezone: branch.timezone,
    isActive: branch.isActive,
  };
}

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /branches — list branches with pagination
  // ──────────────────────────────────────────────
  async getBranches(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      this.prisma.branch.count(),
    ]);

    return {
      data: branches.map(mapBranch),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // POST /branches — create branch
  // ──────────────────────────────────────────────
  async createBranch(dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una sucursal con el código "${dto.code}"`,
      );
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        timezone: dto.timezone ?? 'UTC',
        isActive: dto.isActive ?? true,
      },
    });

    return { data: mapBranch(branch), meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /branches/:id — update branch
  // ──────────────────────────────────────────────
  async updateBranch(id: number, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });

    if (!branch) {
      throw new NotFoundException(`Sucursal con id ${id} no encontrada`);
    }

    // Check code uniqueness if changing
    if (dto.code && dto.code !== branch.code) {
      const conflict = await this.prisma.branch.findUnique({
        where: { code: dto.code },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe una sucursal con el código "${dto.code}"`,
        );
      }
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return { data: mapBranch(updated), meta: {} };
  }
}
