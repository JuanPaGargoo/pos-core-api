import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: number; // user id
  email?: string;
  username?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithPermissions {
  id: number;
  name: string;
  email: string | null;
  username: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  roles: {
    id: number;
    name: string;
    description: string | null;
  }[];
  branches: {
    id: number;
    name: string;
    code: string;
    isDefault: boolean;
  }[];
}

@Injectable()
export class AuthService {
  // In-memory store for refresh tokens (in production, use Redis or database)
  private refreshTokens = new Map<string, number>(); // token -> userId

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validate user credentials and return user if valid.
   * The identifier can be either an email or a username.
   */
  async validateUser(identifier: string, password: string) {
    // Determine if the identifier looks like an email
    const isEmail = identifier.includes('@');

    const user = await this.prisma.user.findFirst({
      where: isEmail ? { email: identifier } : { username: identifier },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await this.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  /**
   * Login user and generate tokens.
   * identifier can be an email or a username.
   */
  async login(identifier: string, password: string): Promise<AuthTokens> {
    const user = await this.validateUser(identifier, password);

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.username,
    );

    // Store refresh token
    this.refreshTokens.set(tokens.refreshToken, user.id);

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });

      // Check if token exists in store
      const userId = this.refreshTokens.get(refreshToken);
      if (!userId || userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user to ensure still active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      // Generate new tokens
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.username,
      );

      // Store new refresh token
      this.refreshTokens.set(tokens.refreshToken, user.id);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  logout(refreshToken: string): void {
    this.refreshTokens.delete(refreshToken);
  }

  /**
   * Get current user with roles and permissions
   */
  async getMe(userId: number): Promise<UserWithPermissions> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        userBranches: {
          include: {
            branch: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
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

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Collect all unique permissions
    const permissionKeys = new Set<string>();
    userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissionKeys.add(rp.permission.key);
      });
    });

    return Array.from(permissionKeys);
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: number,
    email: string | null,
    username: string | null,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: userId,
      ...(email ? { email } : {}),
      ...(username ? { username } : {}),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
      } as any),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRATION'),
      } as any),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
