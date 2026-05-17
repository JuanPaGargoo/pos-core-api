import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { auditExtension } from './audit.extension';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    // Aplica la extensión de auditoría. Devolver el cliente extendido
    // desde el constructor hace que toda inyección de PrismaService lo
    // use; la conexión se abre de forma perezosa en la primera consulta.
    return this.$extends(auditExtension) as unknown as PrismaService;
  }
}
