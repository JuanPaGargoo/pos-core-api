import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the required permission from the handler or class metadata
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permission is required, allow access
    if (!requiredPermission) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: number } }>();
    const user = request.user;

    // JwtAuthGuard must run first — user must be present
    if (!user?.id) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    // Query all permission keys the user holds through their roles
    const permissions = await this.prisma.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: { userId: user.id },
              },
            },
          },
        },
      },
      select: { key: true },
    });

    const hasPermission = permissions.some((p) => p.key === requiredPermission);

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permiso requerido: '${requiredPermission}'`,
      );
    }

    return true;
  }
}
