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
  // categories
  { key: 'categories.create', description: 'Crear categorías' },
  { key: 'categories.read', description: 'Ver categorías' },
  { key: 'categories.update', description: 'Actualizar categorías' },
  // units
  { key: 'units.create', description: 'Crear unidades de medida' },
  { key: 'units.read', description: 'Ver unidades de medida' },
  { key: 'units.update', description: 'Actualizar unidades de medida' },
  // price-lists
  { key: 'price-lists.create', description: 'Crear listas de precios' },
  { key: 'price-lists.read', description: 'Ver listas de precios' },
  { key: 'price-lists.update', description: 'Actualizar listas de precios' },
  // products
  { key: 'products.create', description: 'Crear productos' },
  { key: 'products.read', description: 'Ver productos' },
  { key: 'products.update', description: 'Actualizar productos' },
  // inventory
  { key: 'inventory.read', description: 'Ver inventario y movimientos' },
  {
    key: 'inventory.adjust',
    description: 'Ajustar y traspasar inventario',
  },
  // sales
  { key: 'sales.create', description: 'Registrar ventas' },
  { key: 'sales.read', description: 'Ver ventas' },
  { key: 'sales.cancel', description: 'Cancelar ventas' },
  // cash-sessions
  { key: 'cash-sessions.read', description: 'Ver cortes de caja' },
  { key: 'cash-sessions.open', description: 'Abrir caja' },
  { key: 'cash-sessions.close', description: 'Cerrar caja' },
  // suppliers
  { key: 'suppliers.create', description: 'Crear proveedores' },
  { key: 'suppliers.read', description: 'Ver proveedores' },
  { key: 'suppliers.update', description: 'Actualizar proveedores' },
  // purchases
  { key: 'purchases.create', description: 'Registrar compras' },
  { key: 'purchases.read', description: 'Ver compras' },
  { key: 'purchases.receive', description: 'Recibir y cancelar compras' },
  // customers
  { key: 'customers.create', description: 'Crear clientes' },
  { key: 'customers.read', description: 'Ver clientes' },
  { key: 'customers.update', description: 'Actualizar clientes' },
  { key: 'customers.credit', description: 'Gestionar crédito y abonos' },
  // returns
  { key: 'returns.create', description: 'Registrar devoluciones' },
  { key: 'returns.read', description: 'Ver devoluciones' },
  // promotions
  { key: 'promotions.create', description: 'Crear promociones' },
  { key: 'promotions.read', description: 'Ver promociones' },
  { key: 'promotions.update', description: 'Actualizar promociones' },
  // pos-sync (offline)
  {
    key: 'pos.sync',
    description: 'Sincronizar el punto de venta offline',
  },
  {
    key: 'pos.override',
    description: 'Modificar precios y descuentos en el punto de venta',
  },
  // reports
  { key: 'reports.read', description: 'Ver reportes' },
  // taxes
  { key: 'taxes.create', description: 'Crear impuestos' },
  { key: 'taxes.read', description: 'Ver impuestos' },
  { key: 'taxes.update', description: 'Actualizar impuestos' },
  // farmacia · médicos
  { key: 'doctors.create', description: 'Registrar médicos' },
  { key: 'doctors.read', description: 'Ver médicos' },
  { key: 'doctors.update', description: 'Actualizar médicos' },
  // farmacia · recetas
  { key: 'prescriptions.create', description: 'Registrar recetas médicas' },
  { key: 'prescriptions.read', description: 'Ver recetas y libro de control' },
  { key: 'prescriptions.update', description: 'Actualizar estado de recetas' },
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
        'categories.create',
        'categories.read',
        'categories.update',
        'units.create',
        'units.read',
        'units.update',
        'price-lists.create',
        'price-lists.read',
        'price-lists.update',
        'products.create',
        'products.read',
        'products.update',
        'inventory.read',
        'inventory.adjust',
        'sales.create',
        'sales.read',
        'sales.cancel',
        'cash-sessions.read',
        'cash-sessions.open',
        'cash-sessions.close',
        'suppliers.create',
        'suppliers.read',
        'suppliers.update',
        'purchases.create',
        'purchases.read',
        'purchases.receive',
        'customers.create',
        'customers.read',
        'customers.update',
        'customers.credit',
        'returns.create',
        'returns.read',
        'promotions.create',
        'promotions.read',
        'promotions.update',
        'pos.sync',
        'pos.override',
        'reports.read',
        'taxes.create',
        'taxes.read',
        'taxes.update',
        'doctors.create',
        'doctors.read',
        'doctors.update',
        'prescriptions.create',
        'prescriptions.read',
        'prescriptions.update',
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
        'categories.read',
        'units.read',
        'price-lists.read',
        'products.read',
        'inventory.read',
        'sales.create',
        'sales.read',
        'cash-sessions.read',
        'cash-sessions.open',
        'cash-sessions.close',
        'customers.create',
        'customers.read',
        'customers.credit',
        'returns.create',
        'returns.read',
        'promotions.read',
        'pos.sync',
        'reports.read',
        'doctors.read',
        'prescriptions.create',
        'prescriptions.read',
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
        'categories.read',
        'units.read',
        'products.read',
        'inventory.read',
        'inventory.adjust',
        'suppliers.create',
        'suppliers.read',
        'suppliers.update',
        'purchases.create',
        'purchases.read',
        'purchases.receive',
        'reports.read',
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
// 3b. UNITS of measure base
// ============================================================
const UNITS = [
  { name: 'Pieza', abbreviation: 'pza', allowsDecimal: false },
  { name: 'Kilogramo', abbreviation: 'kg', allowsDecimal: true },
  { name: 'Gramo', abbreviation: 'g', allowsDecimal: true },
  { name: 'Litro', abbreviation: 'L', allowsDecimal: true },
  { name: 'Caja', abbreviation: 'caja', allowsDecimal: false },
];

// ============================================================
// 3c. PRICE LISTS base
// ============================================================
const PRICE_LISTS = [
  { name: 'Público', isDefault: true },
  { name: 'Mayoreo', isDefault: false },
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
    key: 'pharmacy.enabled',
    valueJson: false,
    description: 'Activa el módulo de farmacia (recetas, médicos, control)',
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
  {
    key: 'loyalty.enabled',
    valueJson: false,
    description: 'Programa de puntos de lealtad activo',
  },
  {
    key: 'loyalty.pointsPerCurrency',
    valueJson: 1,
    description: 'Puntos otorgados por cada unidad de moneda gastada',
  },
  {
    key: 'loyalty.currencyPerPoint',
    valueJson: 0.1,
    description: 'Valor en moneda de cada punto al canjear',
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

  // ---- Default branch + warehouse --------------------------
  console.log('Seeding default branch and warehouse…');
  let branch = await prisma.branch.findUnique({ where: { code: 'MATRIZ' } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Matriz',
        code: 'MATRIZ',
        timezone: 'America/Mexico_City',
      },
    });
  }

  let warehouse = await prisma.warehouse.findUnique({
    where: { code: 'ALM-01' },
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        branchId: branch.id,
        name: 'Almacén Principal',
        code: 'ALM-01',
      },
    });
  }

  // Assign the admin user to the default branch
  await prisma.userBranch.upsert({
    where: {
      userId_branchId: { userId: adminUser.id, branchId: branch.id },
    },
    update: { isDefault: true },
    create: { userId: adminUser.id, branchId: branch.id, isDefault: true },
  });
  console.log(
    `  ✅ Branch "Matriz" + warehouse "Almacén Principal" ready (admin assigned)`,
  );

  // ---- Sequences (folios) per branch -----------------------
  console.log('Seeding sequences…');
  const SEQUENCES = [
    { key: 'sale', prefix: 'V-', padding: 6 },
    { key: 'cash_session', prefix: 'C-', padding: 4 },
    { key: 'purchase_order', prefix: 'OC-', padding: 5 },
    { key: 'credit_note', prefix: 'NC-', padding: 5 },
  ];
  const allBranches = await prisma.branch.findMany({ select: { id: true } });
  let seqCount = 0;
  for (const b of allBranches) {
    for (const s of SEQUENCES) {
      await prisma.sequence.upsert({
        where: { branchId_key: { branchId: b.id, key: s.key } },
        update: {},
        create: {
          branchId: b.id,
          key: s.key,
          prefix: s.prefix,
          padding: s.padding,
        },
      });
      seqCount += 1;
    }
  }
  console.log(`  ✅ ${seqCount} sequences upserted`);

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

  // ---- Units of measure ------------------------------------
  console.log('Seeding units…');
  for (const u of UNITS) {
    const existing = await prisma.unit.findFirst({ where: { name: u.name } });
    if (existing) {
      await prisma.unit.update({
        where: { id: existing.id },
        data: { abbreviation: u.abbreviation, allowsDecimal: u.allowsDecimal },
      });
    } else {
      await prisma.unit.create({ data: u });
    }
  }
  console.log(`  ✅ ${UNITS.length} units upserted`);

  // ---- Price lists -----------------------------------------
  console.log('Seeding price lists…');
  for (const pl of PRICE_LISTS) {
    const existing = await prisma.priceList.findFirst({
      where: { name: pl.name },
    });
    if (existing) {
      await prisma.priceList.update({
        where: { id: existing.id },
        data: { isDefault: pl.isDefault },
      });
    } else {
      await prisma.priceList.create({ data: pl });
    }
  }
  console.log(`  ✅ ${PRICE_LISTS.length} price lists upserted`);

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
