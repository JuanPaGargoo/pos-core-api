import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ============================================================
// 1. PERMISSIONS — every key used across controllers
// ============================================================
const ALL_PERMISSIONS: { key: string; description: string }[] = [
  // users
  { key: 'users.create', description: 'Crear usuarios' },
  { key: 'users.read', description: 'Ver usuarios' },
  { key: 'users.update', description: 'Actualizar usuarios' },
  { key: 'users.change_status', description: 'Activar/desactivar usuarios' },
  { key: 'users.assign_roles', description: 'Asignar roles a usuarios' },
  {
    key: 'users.assign_branches',
    description: 'Asignar sucursales a usuarios',
  },
  // roles
  { key: 'roles.create', description: 'Crear roles' },
  { key: 'roles.read', description: 'Ver roles' },
  { key: 'roles.update', description: 'Actualizar roles' },
  { key: 'roles.assign_permissions', description: 'Asignar permisos a roles' },
  // permissions
  { key: 'permissions.read', description: 'Ver permisos' },
  // branches
  { key: 'branches.create', description: 'Crear sucursales' },
  { key: 'branches.read', description: 'Ver sucursales' },
  { key: 'branches.update', description: 'Actualizar sucursales' },
  // warehouses
  { key: 'warehouses.create', description: 'Crear almacenes' },
  { key: 'warehouses.read', description: 'Ver almacenes' },
  { key: 'warehouses.update', description: 'Actualizar almacenes' },
  // locations
  { key: 'locations.create', description: 'Crear ubicaciones' },
  { key: 'locations.read', description: 'Ver ubicaciones' },
  { key: 'locations.update', description: 'Actualizar ubicaciones' },
  // payment-methods
  { key: 'payment-methods.create', description: 'Crear métodos de pago' },
  { key: 'payment-methods.read', description: 'Ver métodos de pago' },
  { key: 'payment-methods.update', description: 'Actualizar métodos de pago' },
  // sequences
  { key: 'sequences.read', description: 'Ver secuencias' },
  { key: 'sequences.update', description: 'Actualizar secuencias' },
  // settings
  { key: 'settings.read', description: 'Ver configuraciones' },
  { key: 'settings.update', description: 'Actualizar configuraciones' },
  // audit-logs
  { key: 'audit-logs.read', description: 'Ver logs de auditoría' },
];

// ============================================================
// 2. ROLES and which permissions each one gets
// ============================================================
const ROLES: { name: string; description: string; permissionKeys: string[] }[] =
  [
    {
      name: 'admin',
      description: 'Administrador con acceso total al sistema',
      permissionKeys: ALL_PERMISSIONS.map((p) => p.key), // ALL
    },
    {
      name: 'manager',
      description: 'Gerente de sucursal',
      permissionKeys: [
        'users.read',
        'users.create',
        'users.update',
        'users.change_status',
        'users.assign_roles',
        'users.assign_branches',
        'roles.read',
        'permissions.read',
        'branches.read',
        'warehouses.read',
        'warehouses.create',
        'warehouses.update',
        'locations.read',
        'locations.create',
        'locations.update',
        'payment-methods.read',
        'payment-methods.create',
        'payment-methods.update',
        'sequences.read',
        'sequences.update',
        'settings.read',
        'settings.update',
        'audit-logs.read',
      ],
    },
    {
      name: 'cashier',
      description: 'Cajero de punto de venta',
      permissionKeys: [
        'branches.read',
        'payment-methods.read',
        'sequences.read',
        'settings.read',
      ],
    },
    {
      name: 'warehouse',
      description: 'Encargado de almacén',
      permissionKeys: [
        'branches.read',
        'warehouses.read',
        'warehouses.update',
        'locations.read',
        'locations.create',
        'locations.update',
        'settings.read',
      ],
    },
  ];

// ============================================================
// 3. PAYMENT METHODS base
// ============================================================
const PAYMENT_METHODS = [
  { name: 'Efectivo', type: 'cash', requiresReference: false },
  { name: 'Tarjeta', type: 'card', requiresReference: true },
  { name: 'Transferencia', type: 'transfer', requiresReference: true },
];

// ============================================================
// 4. SETTINGS base (global scope)
// ============================================================
const BASE_SETTINGS: {
  key: string;
  valueJson: unknown;
  description: string;
}[] = [
  {
    key: 'company.name',
    valueJson: 'Mi Empresa POS',
    description: 'Nombre de la empresa',
  },
  {
    key: 'company.currency',
    valueJson: 'MXN',
    description: 'Moneda por defecto',
  },
  {
    key: 'company.timezone',
    valueJson: 'America/Mexico_City',
    description: 'Zona horaria por defecto',
  },
  {
    key: 'invoice.defaultTaxRate',
    valueJson: 16,
    description: 'Tasa de impuesto por defecto (%)',
  },
  {
    key: 'invoice.footer',
    valueJson: 'Gracias por su compra',
    description: 'Texto al pie de factura/ticket',
  },
  {
    key: 'inventory.allowNegativeStock',
    valueJson: false,
    description: 'Permitir stock negativo',
  },
  {
    key: 'inventory.defaultWarehouseStrategy',
    valueJson: 'FIFO',
    description: 'Estrategia de salida de inventario (FIFO/LIFO)',
  },
];

// ============================================================
// MAIN
// ============================================================
async function main() {
  // ---- Permissions -----------------------------------------
  console.log('Seeding permissions…');
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`  ✅ ${ALL_PERMISSIONS.length} permissions upserted`);

  // ---- Roles + RolePermissions -----------------------------
  console.log('Seeding roles…');
  for (const roleDef of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: { name: roleDef.name, description: roleDef.description },
    });

    // Fetch permission ids for this role
    const permissions = await prisma.permission.findMany({
      where: { key: { in: roleDef.permissionKeys } },
      select: { id: true },
    });

    // Remove old associations and re-create
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  ✅ Role "${role.name}" → ${permissions.length} permissions`);
  }

  // ---- Admin user ------------------------------------------
  console.log('Seeding admin user…');
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'Administrador',
      username: 'admin',
      email: 'admin@gmail.com',
      passwordHash,
      isActive: true,
    },
  });

  // Assign admin role
  const adminRole = await prisma.role.findUnique({
    where: { name: 'admin' },
  });

  if (adminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: adminUser.id, roleId: adminRole.id },
      },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    });
  }

  console.log(
    `  ✅ Admin user created: username=admin, email=admin@gmail.com, password=admin123`,
  );

  // ---- Payment Methods -------------------------------------
  console.log('Seeding payment methods…');
  for (const pm of PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: {
        id:
          (await prisma.paymentMethod.findFirst({ where: { name: pm.name } }))
            ?.id ?? 0,
      },
      update: { type: pm.type, requiresReference: pm.requiresReference },
      create: pm,
    });
  }
  console.log(`  ✅ ${PAYMENT_METHODS.length} payment methods upserted`);

  // ---- Settings (global scope) -----------------------------
  console.log('Seeding global settings…');
  for (const s of BASE_SETTINGS) {
    const existing = await prisma.setting.findFirst({
      where: { scope: 'global', branchId: null, key: s.key },
    });

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { valueJson: s.valueJson as any },
      });
    } else {
      await prisma.setting.create({
        data: {
          scope: 'global',
          branchId: null,
          key: s.key,
          valueJson: s.valueJson as any,
        },
      });
    }
  }
  console.log(`  ✅ ${BASE_SETTINGS.length} global settings upserted`);

  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
    void prisma.$disconnect();
  });
