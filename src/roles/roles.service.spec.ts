import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  role: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  permission: {
    findMany: jest.fn(),
  },
  rolePermission: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn((args: unknown) => {
    if (Array.isArray(args)) return Promise.all(args);
    return (args as () => Promise<unknown>)();
  }),
};

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // getRoles
  // ──────────────────────────────────────────────
  describe('getRoles', () => {
    it('should return paginated roles', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'admin',
          description: 'Admin',
          rolePermissions: [
            { permission: { id: 1, key: 'users.read', description: 'Read' } },
          ],
          _count: { userRoles: 2 },
        },
      ]);
      mockPrisma.role.count.mockResolvedValue(1);

      const result = await service.getRoles({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].permissions).toHaveLength(1);
      expect(result.data[0].usersCount).toBe(2);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
    });
  });

  // ──────────────────────────────────────────────
  // createRole
  // ──────────────────────────────────────────────
  describe('createRole', () => {
    it('should create a role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);
      mockPrisma.role.create.mockResolvedValue({
        id: 1,
        name: 'new-role',
        description: 'A new role',
      });

      const result = await service.createRole({
        name: 'new-role',
        description: 'A new role',
      });

      expect(result.name).toBe('new-role');
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin' });

      await expect(service.createRole({ name: 'admin' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // updateRole
  // ──────────────────────────────────────────────
  describe('updateRole', () => {
    it('should update a role', async () => {
      mockPrisma.role.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'old-name', description: null }) // find by id
        .mockResolvedValueOnce(null); // name conflict check → no conflict
      mockPrisma.role.update.mockResolvedValue({
        id: 1,
        name: 'new-name',
        description: 'Updated',
      });

      const result = await service.updateRole(1, {
        name: 'new-name',
        description: 'Updated',
      });

      expect(result.name).toBe('new-name');
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.updateRole(999, { name: 'nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate name', async () => {
      mockPrisma.role.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'old' })
        .mockResolvedValueOnce({ id: 2, name: 'taken' }); // conflict

      await expect(service.updateRole(1, { name: 'taken' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // assignPermissions
  // ──────────────────────────────────────────────
  describe('assignPermissions', () => {
    it('should assign permissions to a role', async () => {
      mockPrisma.role.findUnique
        .mockResolvedValueOnce({ id: 1, name: 'admin' }) // role exists
        .mockResolvedValueOnce({
          id: 1,
          name: 'admin',
          description: 'Admin',
          rolePermissions: [
            { permission: { id: 1, key: 'users.read', description: 'Read' } },
            {
              permission: {
                id: 2,
                key: 'users.create',
                description: 'Create',
              },
            },
          ],
        }); // return updated
      mockPrisma.permission.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 2 });

      const result = await service.assignPermissions(1, {
        permissionIds: [1, 2],
      });

      expect(result.permissions).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent role', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(
        service.assignPermissions(999, { permissionIds: [1] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for missing permissions', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin' });
      mockPrisma.permission.findMany.mockResolvedValue([{ id: 1 }]); // only one found of two requested

      await expect(
        service.assignPermissions(1, { permissionIds: [1, 99] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getPermissions
  // ──────────────────────────────────────────────
  describe('getPermissions', () => {
    it('should return all permissions', async () => {
      const perms = [
        { id: 1, key: 'users.read', description: 'Read users' },
        { id: 2, key: 'roles.read', description: 'Read roles' },
      ];
      mockPrisma.permission.findMany.mockResolvedValue(perms);

      const result = await service.getPermissions();

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
