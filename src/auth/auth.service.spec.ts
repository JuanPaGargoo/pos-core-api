import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Mocks ────────────────────────────────────────
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userRole: {
    findMany: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRATION: '15m',
      REFRESH_TOKEN_SECRET: 'test-refresh-secret',
      REFRESH_TOKEN_EXPIRATION: '7d',
    };
    return map[key];
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  // validateUser
  // ──────────────────────────────────────────────
  describe('validateUser', () => {
    const fakeUser = {
      id: 1,
      name: 'Admin',
      username: 'admin',
      email: 'admin@gmail.com',
      passwordHash: '', // will be set in test
      isActive: true,
    };

    it('should return user when credentials are valid (email)', async () => {
      const hash = await bcrypt.hash('admin123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        ...fakeUser,
        passwordHash: hash,
      });

      const result = await service.validateUser('admin@gmail.com', 'admin123');
      expect(result.id).toBe(1);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'admin@gmail.com' },
      });
    });

    it('should return user when credentials are valid (username)', async () => {
      const hash = await bcrypt.hash('admin123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        ...fakeUser,
        passwordHash: hash,
      });

      const result = await service.validateUser('admin', 'admin123');
      expect(result.id).toBe(1);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'admin' },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.validateUser('unknown@test.com', 'pass'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...fakeUser,
        isActive: false,
        passwordHash: await bcrypt.hash('admin123', 10),
      });

      await expect(
        service.validateUser('admin@gmail.com', 'admin123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...fakeUser,
        passwordHash: await bcrypt.hash('admin123', 10),
      });

      await expect(
        service.validateUser('admin@gmail.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ──────────────────────────────────────────────
  // login
  // ──────────────────────────────────────────────
  describe('login', () => {
    it('should return access and refresh tokens on successful login', async () => {
      const hash = await bcrypt.hash('admin123', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        name: 'Admin',
        username: 'admin',
        email: 'admin@gmail.com',
        passwordHash: hash,
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token-123')
        .mockResolvedValueOnce('refresh-token-456');

      const result = await service.login('admin', 'admin123');

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { lastLoginAt: expect.any(Date) },
        }),
      );
    });

    it('should throw when credentials are invalid', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login('bad', 'bad')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // refresh
  // ──────────────────────────────────────────────
  describe('refresh', () => {
    it('should return new tokens for a valid refresh token', async () => {
      const hash = await bcrypt.hash('admin123', 10);
      // First login to store refresh token
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        name: 'Admin',
        username: 'admin',
        email: 'admin@gmail.com',
        passwordHash: hash,
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-1')
        .mockResolvedValueOnce('refresh-1');

      const loginResult = await service.login('admin', 'admin123');

      // Now refresh
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        isActive: true,
        email: 'admin@gmail.com',
        username: 'admin',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-2')
        .mockResolvedValueOnce('refresh-2');

      const result = await service.refresh(loginResult.refreshToken);

      expect(result).toEqual({
        accessToken: 'access-2',
        refreshToken: 'refresh-2',
      });
    });

    it('should throw for an invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // logout
  // ──────────────────────────────────────────────
  describe('logout', () => {
    it('should remove the refresh token from memory', async () => {
      // Login first
      const hash = await bcrypt.hash('pass', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        name: 'Test',
        username: 'test',
        email: null,
        passwordHash: hash,
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockJwtService.signAsync
        .mockResolvedValueOnce('a')
        .mockResolvedValueOnce('r');

      const { refreshToken } = await service.login('test', 'pass');

      // Logout
      service.logout(refreshToken);

      // Attempt refresh should fail
      mockJwtService.verify.mockReturnValue({ sub: 1 });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, isActive: true });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // getMe
  // ──────────────────────────────────────────────
  describe('getMe', () => {
    it('should return user with roles and branches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Admin',
        email: 'admin@gmail.com',
        username: 'admin',
        isActive: true,
        lastLoginAt: null,
        userRoles: [
          {
            role: { id: 1, name: 'admin', description: 'Admin role' },
          },
        ],
        userBranches: [
          {
            branch: { id: 1, name: 'Main', code: 'MAIN' },
            isDefault: true,
          },
        ],
      });

      const result = await service.getMe(1);
      expect(result.id).toBe(1);
      expect(result.roles).toHaveLength(1);
      expect(result.roles[0].name).toBe('admin');
      expect(result.branches).toHaveLength(1);
      expect(result.branches[0].isDefault).toBe(true);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(999)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ──────────────────────────────────────────────
  // getUserPermissions
  // ──────────────────────────────────────────────
  describe('getUserPermissions', () => {
    it('should return unique permission keys', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          role: {
            rolePermissions: [
              { permission: { key: 'users.read' } },
              { permission: { key: 'users.create' } },
            ],
          },
        },
        {
          role: {
            rolePermissions: [
              { permission: { key: 'users.read' } }, // duplicate
              { permission: { key: 'roles.read' } },
            ],
          },
        },
      ]);

      const result = await service.getUserPermissions(1);
      expect(result).toEqual(
        expect.arrayContaining(['users.read', 'users.create', 'roles.read']),
      );
      expect(result).toHaveLength(3); // no duplicates
    });
  });

  // ──────────────────────────────────────────────
  // hashPassword / comparePassword
  // ──────────────────────────────────────────────
  describe('password hashing', () => {
    it('should hash and verify password correctly', async () => {
      const hash = await service.hashPassword('secretPass');
      expect(hash).not.toBe('secretPass');

      const isValid = await service.comparePassword('secretPass', hash);
      expect(isValid).toBe(true);

      const isInvalid = await service.comparePassword('wrong', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
