import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { UnitsModule } from './units/units.module';
import { CategoriesModule } from './categories/categories.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CashSessionsModule } from './cash-sessions/cash-sessions.module';
import { SalesModule } from './sales/sales.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { CustomersModule } from './customers/customers.module';
import { ReturnsModule } from './returns/returns.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PosSyncModule } from './pos-sync/pos-sync.module';
import { ReportsModule } from './reports/reports.module';
import { TaxesModule } from './taxes/taxes.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: '.env',
    }),
    // Rate limiting global. Detrás del BFF de Next todo el tráfico llega
    // desde una sola IP (el contenedor web), así que este límite es por
    // toda la app, no por usuario. El default es amplio para no bloquear el
    // uso normal; se puede ajustar con THROTTLE_TTL / THROTTLE_LIMIT.
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60_000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 1000),
      },
    ]),
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
    UnitsModule,
    CategoriesModule,
    PriceListsModule,
    ProductsModule,
    InventoryModule,
    CashSessionsModule,
    SalesModule,
    SuppliersModule,
    PurchasesModule,
    CustomersModule,
    ReturnsModule,
    PromotionsModule,
    PosSyncModule,
    ReportsModule,
    TaxesModule,
    DoctorsModule,
    PrescriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
