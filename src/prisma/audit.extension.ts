/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { getCurrentUserId } from '../common/request-context';

/**
 * Modelos que llevan las columnas de auditoría
 * `created_by_id` / `updated_by_id`. Los movimientos (ventas,
 * devoluciones, etc.) registran al responsable con su propio `userId`.
 */
const AUDITED_MODELS = new Set<string>([
  'User',
  'Role',
  'Permission',
  'Branch',
  'Warehouse',
  'Location',
  'PaymentMethod',
  'Tax',
  'Sequence',
  'Setting',
  'Category',
  'Unit',
  'Product',
  'PriceList',
  'Supplier',
  'Customer',
  'Promotion',
  'Doctor',
]);

type QueryCtx = {
  model: string;
  operation: string;
  args: any;
  query: (args: any) => Promise<any>;
};

function stampCreate(data: any, userId: number): any {
  if (Array.isArray(data)) {
    return data.map((d) => ({
      createdById: userId,
      updatedById: userId,
      ...d,
    }));
  }
  if (data && typeof data === 'object') {
    return { createdById: userId, updatedById: userId, ...data };
  }
  return data;
}

function stampUpdate(data: any, userId: number): any {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...data, updatedById: userId };
  }
  return data;
}

/**
 * Extensión de Prisma que rellena automáticamente quién creó y quién
 * editó cada registro de catálogo, tomando el usuario del contexto de
 * la petición. Sin contexto (seeds, scripts) no toca nada.
 */
export const auditExtension = {
  name: 'audit',
  query: {
    $allModels: {
      create(ctx: QueryCtx) {
        const uid = getCurrentUserId();
        if (uid != null && AUDITED_MODELS.has(ctx.model)) {
          ctx.args.data = stampCreate(ctx.args.data, uid);
        }
        return ctx.query(ctx.args);
      },
      createMany(ctx: QueryCtx) {
        const uid = getCurrentUserId();
        if (uid != null && AUDITED_MODELS.has(ctx.model)) {
          ctx.args.data = stampCreate(ctx.args.data, uid);
        }
        return ctx.query(ctx.args);
      },
      update(ctx: QueryCtx) {
        const uid = getCurrentUserId();
        if (uid != null && AUDITED_MODELS.has(ctx.model)) {
          ctx.args.data = stampUpdate(ctx.args.data, uid);
        }
        return ctx.query(ctx.args);
      },
      updateMany(ctx: QueryCtx) {
        const uid = getCurrentUserId();
        if (uid != null && AUDITED_MODELS.has(ctx.model)) {
          ctx.args.data = stampUpdate(ctx.args.data, uid);
        }
        return ctx.query(ctx.args);
      },
      upsert(ctx: QueryCtx) {
        const uid = getCurrentUserId();
        if (uid != null && AUDITED_MODELS.has(ctx.model)) {
          ctx.args.create = stampCreate(ctx.args.create, uid);
          ctx.args.update = stampUpdate(ctx.args.update, uid);
        }
        return ctx.query(ctx.args);
      },
    },
  },
};
