import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionsDto,
  PaginationQueryDto,
} from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /roles — list roles with pagination
  // ──────────────────────────────────────────────
  async getRoles(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          _count: { select: { userRoles: true } },
        },
      }),
      this.prisma.role.count(),
    ]);

    return {
      data: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.rolePermissions.map((rp) => ({
          id: rp.permission.id,
          key: rp.permission.key,
          description: rp.permission.description,
        })),
        usersCount: role._count.userRoles,
      })),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // POST /roles — create role
  // ──────────────────────────────────────────────
  async createRole(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un rol con el nombre "${dto.name}"`,
      );
    }

    const role = await this.prisma.role.create({
      data: { name: dto.name, description: dto.description },
    });

    return role;
  }

  // ──────────────────────────────────────────────
  // PUT /roles/:id — update role
  // ──────────────────────────────────────────────
  async updateRole(id: number, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    if (dto.name && dto.name !== role.name) {
      const nameConflict = await this.prisma.role.findUnique({
        where: { name: dto.name },
      });
      if (nameConflict) {
        throw new ConflictException(
          `Ya existe un rol con el nombre "${dto.name}"`,
        );
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return updated;
  }

  // ──────────────────────────────────────────────
  // PUT /roles/:id/permissions — assign permissions
  // ──────────────────────────────────────────────
  async assignPermissions(id: number, dto: AssignPermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });

    if (!role) {
      throw new NotFoundException(`Rol con id ${id} no encontrado`);
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { id: { in: dto.permissionIds } },
    });

    if (permissions.length !== dto.permissionIds.length) {
      const found = permissions.map((p) => p.id);
      const missing = dto.permissionIds.filter((pid) => !found.includes(pid));
      throw new NotFoundException(
        `Permisos no encontrados: ids [${missing.join(', ')}]`,
      );
    }

    // Replace permissions atomically inside a transaction
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      }),
    ]);

    // Return updated role with permissions
    const updated = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });

    return {
      id: updated!.id,
      name: updated!.name,
      description: updated!.description,
      permissions: updated!.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        key: rp.permission.key,
        description: rp.permission.description,
      })),
    };
  }

  // ──────────────────────────────────────────────
  // GET /permissions — list all available permissions
  // ──────────────────────────────────────────────
  async getPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });

    return {
      data: permissions,
      meta: { total: permissions.length },
    };
  }
}
