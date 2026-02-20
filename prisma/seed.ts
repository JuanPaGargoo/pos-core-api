import { PrismaClient } from '../src/generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@gmail.com',
      passwordHash,
      isActive: true,
    },
  });

  console.log('✅ Usuario creado:', user.email, '/ admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void pool.end();
    void prisma.$disconnect();
  });
