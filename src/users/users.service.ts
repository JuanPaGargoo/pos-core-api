import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  Branch,
  Permission,
  Role,
  RolePermission,
  User,
  UserBranch,
  UserRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignBranchesDto,
  AssignRolesDto,
  ChangeStatusDto,
  CreateUserDto,
  PaginationQueryDto,
  UpdateUserDto,
} from './dto';

export interface AuditContext {
  userId?: number;
  ip?: string;
  userAgent?: string;
}

const BCRYPT_SALT_ROUNDS = 10;

type UserWithRelations = User & {
  userRoles: (UserRole & {
    role: Role & {
      rolePermissions: (RolePermission & { permission: Permission })[];
    };
  })[];
  userBranches: (UserBranch & { branch: Branch })[];
};

// Fields to include for a user response
const USER_INCLUDE = {
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  },
  userBranches: {
    include: { branch: true },
  },
} as const;

function mapUser(user: UserWithRelations) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: user.userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    branches: user.userBranches.map((ub) => ({
      id: ub.branch.id,
      name: ub.branch.name,
      code: ub.branch.code,
      isDefault: ub.isDefault,
    })),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /users — list users with pagination
  // ──────────────────────────────────────────────
  async getUsers(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { id: 'asc' },
        include: USER_INCLUDE,
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users.map(mapUser),
      meta: { page, limit, total },
    };
  }

  // ──────────────────────────────────────────────
  // POST /users — create user
  // ──────────────────────────────────────────────
  async createUser(dto: CreateUserDto, ctx: AuditContext) {
    // Check uniqueness of username and email
    if (dto.username) {
      const byUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (byUsername) {
        throw new ConflictException(
          `Ya existe un usuario con el username "${dto.username}"`,
        );
      }
    }

    if (dto.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (byEmail) {
        throw new ConflictException(
          `Ya existe un usuario con el email "${dto.email}"`,
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        username: dto.username,
        email: dto.email,
        passwordHash,
      },
      include: USER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        message: `Usuario "${user.name}" creado`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: {
          name: user.name,
          username: user.username,
          email: user.email,
        },
      },
    });

    return mapUser(user);
  }

  // ──────────────────────────────────────────────
  // GET /users/:id — get user by id
  // ──────────────────────────────────────────────
  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return mapUser(user);
  }

  // ──────────────────────────────────────────────
  // PUT /users/:id — update user
  // ──────────────────────────────────────────────
  async updateUser(id: number, dto: UpdateUserDto, ctx: AuditContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    // Check username uniqueness if changing
    if (dto.username && dto.username !== user.username) {
      const conflict = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe un usuario con el username "${dto.username}"`,
        );
      }
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe un usuario con el email "${dto.email}"`,
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: USER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: updated.id,
        message: `Usuario "${updated.name}" actualizado`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: { previous: user, updated: dto } as any,
      },
    });

    return mapUser(updated);
  }

  // ──────────────────────────────────────────────
  // PATCH /users/:id/status — toggle is_active
  // ──────────────────────────────────────────────
  async changeStatus(id: number, dto: ChangeStatusDto, ctx: AuditContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      include: USER_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'STATUS_CHANGE',
        entity: 'User',
        entityId: updated.id,
        message: `Usuario "${updated.name}" ${dto.isActive ? 'activado' : 'desactivado'}`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: { isActive: dto.isActive },
      },
    });

    return mapUser(updated);
  }

  // ──────────────────────────────────────────────
  // PUT /users/:id/roles — assign roles (replace)
  // ──────────────────────────────────────────────
  async assignRoles(id: number, dto: AssignRolesDto, ctx: AuditContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    // Verify all roles exist
    const roles = await this.prisma.role.findMany({
      where: { id: { in: dto.roleIds } },
    });

    if (roles.length !== dto.roleIds.length) {
      const found = roles.map((r) => r.id);
      const missing = dto.roleIds.filter((rid) => !found.includes(rid));
      throw new NotFoundException(
        `Roles no encontrados: ids [${missing.join(', ')}]`,
      );
    }

    // Replace roles atomically
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'PERMISSION_CHANGE',
        entity: 'User',
        entityId: id,
        message: `Roles del usuario "${user.name}" actualizados`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: {
          roleIds: dto.roleIds,
          roleNames: roles.map((r) => r.name),
        },
      },
    });

    const updated = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    return mapUser(updated!);
  }

  // ──────────────────────────────────────────────
  // PUT /users/:id/branches — assign branches (replace)
  // ──────────────────────────────────────────────
  async assignBranches(id: number, dto: AssignBranchesDto, ctx: AuditContext) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    const branchIds = dto.branches.map((b) => b.branchId);

    // Verify all branches exist
    const branches = await this.prisma.branch.findMany({
      where: { id: { in: branchIds } },
    });

    if (branches.length !== branchIds.length) {
      const found = branches.map((b) => b.id);
      const missing = branchIds.filter((bid) => !found.includes(bid));
      throw new NotFoundException(
        `Sucursales no encontradas: ids [${missing.join(', ')}]`,
      );
    }

    // Replace branches atomically
    await this.prisma.$transaction([
      this.prisma.userBranch.deleteMany({ where: { userId: id } }),
      this.prisma.userBranch.createMany({
        data: dto.branches.map((b) => ({
          userId: id,
          branchId: b.branchId,
          isDefault: b.isDefault ?? false,
        })),
      }),
    ]);

    await this.prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        message: `Sucursales del usuario "${user.name}" actualizadas`,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        payloadJson: {
          branches: dto.branches,
          branchNames: branches.map((b) => b.name),
        } as any,
      },
    });

    const updated = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    return mapUser(updated!);
  }
}
