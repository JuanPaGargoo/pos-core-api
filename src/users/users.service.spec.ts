import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mock helpers ─────────────────────────────────
const makeUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: 'test@test.com',
  passwordHash: '$2b$10$hashedpassword',
  isActive: true,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  userRoles: [],
  userBranches: [],
  ...overrides,
});

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  role: {
    findMany: jest.fn(),
  },
  branch: {
    findMany: jest.fn(),
  },
  userRole: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  userBranch: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn((args: unknown) => {
    if (Array.isArray(args)) return Promise.all(args);
    return (args as () => Promise<unknown>)();
  }),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // getUsers (list with pagination)
  // ──────────────────────────────────────────────
  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const users = [makeUser()];
      mockPrisma.user.findMany.mockResolvedValue(users);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1 });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('should use default pagination values', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const result = await service.getUsers({});

      expect(result.meta).toEqual({ page: 1, limit: 25, total: 0 });
    });
  });

  // ──────────────────────────────────────────────
  // createUser
  // ──────────────────────────────────────────────
  describe('createUser', () => {
    it('should create a user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // no conflict
      mockPrisma.user.create.mockResolvedValue(makeUser());

      const result = await service.createUser({
        name: 'Test User',
        username: 'testuser',
        email: 'test@test.com',
        password: 'password123',
      });

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test User');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser()); // username exists

      await expect(
        service.createUser({
          name: 'New',
          username: 'testuser',
          password: 'pass123456',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException for duplicate email', async () => {
      // username check: no conflict
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        // email check: conflict
        .mockResolvedValueOnce(makeUser());

      await expect(
        service.createUser({
          name: 'New',
          username: 'unique',
          email: 'test@test.com',
          password: 'pass123456',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // getUserById
  // ──────────────────────────────────────────────
  describe('getUserById', () => {
    it('should return a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      const result = await service.getUserById(1);
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // updateUser
  // ──────────────────────────────────────────────
  describe('updateUser', () => {
    it('should update user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(
        makeUser({ name: 'Updated Name' }),
      );

      const result = await service.updateUser(1, { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser(999, { name: 'Nobody' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for duplicate username on update', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(makeUser()) // user exists
        .mockResolvedValueOnce(makeUser({ id: 2, username: 'taken' })); // conflict

      await expect(
        service.updateUser(1, { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────
  // changeStatus
  // ──────────────────────────────────────────────
  describe('changeStatus', () => {
    it('should deactivate a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser({ isActive: false }));

      const result = await service.changeStatus(1, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changeStatus(999, { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // assignRoles
  // ──────────────────────────────────────────────
  describe('assignRoles', () => {
    it('should assign roles to a user', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(makeUser()) // check user exists
        .mockResolvedValueOnce(
          makeUser({
            userRoles: [{ role: { id: 1, name: 'admin', description: null } }],
          }),
        ); // after assignment
      mockPrisma.role.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userRole.createMany.mockResolvedValue({ count: 1 });

      const result = await service.assignRoles(1, { roleIds: [1] });
      expect(result.roles).toHaveLength(1);
    });

    it('should throw NotFoundException for missing roles', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.role.findMany.mockResolvedValue([]); // none found

      await expect(service.assignRoles(1, { roleIds: [99] })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // assignBranches
  // ──────────────────────────────────────────────
  describe('assignBranches', () => {
    it('should assign branches to a user', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(makeUser())
        .mockResolvedValueOnce(
          makeUser({
            userBranches: [
              {
                branch: { id: 1, name: 'Main', code: 'MAIN' },
                isDefault: true,
              },
            ],
          }),
        );
      mockPrisma.branch.findMany.mockResolvedValue([{ id: 1 }]);
      mockPrisma.userBranch.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userBranch.createMany.mockResolvedValue({ count: 1 });

      const result = await service.assignBranches(1, {
        branches: [{ branchId: 1, isDefault: true }],
      });
      expect(result.branches).toHaveLength(1);
      expect(result.branches[0].isDefault).toBe(true);
    });

    it('should throw NotFoundException for missing branches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.branch.findMany.mockResolvedValue([]);

      await expect(
        service.assignBranches(1, {
          branches: [{ branchId: 99, isDefault: false }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
