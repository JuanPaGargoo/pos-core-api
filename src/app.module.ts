import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { LocationsModule } from './locations/locations.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { SettingsModule } from './settings/settings.module';
import { SequencesModule } from './sequences/sequences.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    PrismaModule,
    CommonModule,
    AuditLogsModule,
    HealthModule,
    AuthModule,
    RolesModule,
    UsersModule,
    BranchesModule,
    WarehousesModule,
    LocationsModule,
    PaymentMethodsModule,
    SettingsModule,
    SequencesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
