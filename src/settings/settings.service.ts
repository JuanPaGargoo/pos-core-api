import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Setting } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuerySettingsDto, UpsertSettingDto } from './dto';

function mapSetting(s: Setting) {
  return {
    id: s.id,
    scope: s.scope,
    branchId: s.branchId,
    key: s.key,
    valueJson: s.valueJson,
  };
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // GET /settings — fetch settings with fallback logic
  //
  // Fallback: when branchId is provided, the response merges global
  // settings as defaults and overrides them with any branch-specific
  // values. Keys present only in the branch are also included.
  // ──────────────────────────────────────────────
  async getSettings(query: QuerySettingsDto) {
    // When a branchId is given, always apply fallback regardless of scope
    if (query.branchId !== undefined) {
      // Validate branch exists
      const branch = await this.prisma.branch.findUnique({
        where: { id: query.branchId },
      });
      if (!branch) {
        throw new NotFoundException(
          `Sucursal con id ${query.branchId} no encontrada`,
        );
      }

      const [globalSettings, branchSettings] = await Promise.all([
        this.prisma.setting.findMany({
          where: {
            scope: 'global',
            branchId: null,
            ...(query.key && { key: query.key }),
          },
        }),
        this.prisma.setting.findMany({
          where: {
            scope: 'branch',
            branchId: query.branchId,
            ...(query.key && { key: query.key }),
          },
        }),
      ]);

      // Merge: branch overrides global
      const merged = new Map<string, Setting>();
      for (const s of globalSettings) merged.set(s.key, s);
      for (const s of branchSettings) merged.set(s.key, s);

      return {
        data: Array.from(merged.values()).map(mapSetting),
        meta: { branchId: query.branchId, fallbackApplied: true },
      };
    }

    // Simple filtered list
    const where: Record<string, unknown> = {};
    if (query.scope) where.scope = query.scope;
    if (query.key) where.key = query.key;

    const settings = await this.prisma.setting.findMany({
      where,
      orderBy: [{ scope: 'asc' }, { key: 'asc' }],
    });

    return { data: settings.map(mapSetting), meta: {} };
  }

  // ──────────────────────────────────────────────
  // PUT /settings — upsert a single setting
  // ──────────────────────────────────────────────
  async upsertSetting(dto: UpsertSettingDto) {
    if (dto.scope === 'branch' && dto.branchId === undefined) {
      throw new BadRequestException(
        'El campo branchId es requerido cuando scope es "branch"',
      );
    }
    if (dto.scope === 'global' && dto.branchId !== undefined) {
      throw new BadRequestException(
        'El campo branchId debe omitirse cuando scope es "global"',
      );
    }

    if (dto.scope === 'branch' && dto.branchId !== undefined) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branchId },
      });
      if (!branch) {
        throw new NotFoundException(
          `Sucursal con id ${dto.branchId} no encontrada`,
        );
      }
    }

    // Manual upsert — Prisma's native upsert can't use null in compound unique key
    const existing = await this.prisma.setting.findFirst({
      where: {
        scope: dto.scope,
        branchId: dto.branchId ?? null,
        key: dto.key,
      },
    });

    const valueJson = dto.valueJson as Prisma.InputJsonValue;

    let setting: Setting;
    if (existing) {
      setting = await this.prisma.setting.update({
        where: { id: existing.id },
        data: { valueJson },
      });
    } else {
      setting = await this.prisma.setting.create({
        data: {
          scope: dto.scope,
          branchId: dto.branchId ?? null,
          key: dto.key,
          valueJson,
        },
      });
    }

    return { data: mapSetting(setting), meta: {} };
  }
}
