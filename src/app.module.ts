import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import rateLimitConfig from './core/security/rate-limit.config';
import securityHardeningConfig from './core/security/security-hardening.config';
import databaseConfig from './config/database.config';
import aiMLConfig from './config/ai-ml.config';
import integrationConfig from './config/integration.config';
import cacheConfig from './config/cache.config';
import { ScheduleModule } from '@nestjs/schedule';
import { 
  SecurityModule,
  ObservabilityModule,
  ResilienceModule,
  TestingModule,
  DataModule,
  InfrastructureModule,
  DevelopmentModule
} from './common/modules';
import { FeatureFlagsModule } from './core/feature-flags/feature-flags.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { RateLimitInterceptor } from './common/interceptors/rate-limit.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { RedisService } from './core/cache/redis.service';
import { StatusModule } from './status/status.module';
import { TasksModule } from './modules/mobile/tasks/tasks.module';
import { MobileModule } from './modules/mobile/mobile.module';
// AI module temporarily disabled due to circular dependency issues
import { DatabaseModule } from './database/database.module';
import { CacheModule } from './core/cache/cache.module';
import { ProductsModule } from './modules/shared/products/products.module';
import { OrdersModule } from './modules/shared/orders/orders.module';
import { CRMModule } from './modules/shared/crm/crm.module';
import { ERPModule } from './modules/shared/erp/erp.module';
import { WmsModule } from './modules/shared/wms/wms.module';
import { TmsModule } from './modules/logistics/tms/tms.module';
import { MarketingModule } from './modules/shared/marketing/marketing.module';
import { ContentModule } from './modules/shared/content/content.module';
import { LotManagementModule } from './modules/shared/lot-management/lot-management.module';
import { WarehouseOperationsModule } from './modules/shared/warehouse-operations/warehouse-operations.module';
import { HandheldTerminalModule } from './modules/shared/handheld-terminal/handheld-terminal.module';
import { VehicleTrackingModule } from './modules/shared/vehicle-tracking/vehicle-tracking.module';
import { AccountingModule } from './modules/shared/accounting/accounting.module';
import { SupplierIntegrationModule } from './modules/shared/supplier-integration/supplier-integration.module';
import { PricingCampaignsModule } from './modules/shared/pricing-campaigns/pricing-campaigns.module';
// import { NotificationsModule } from './modules/notifications/notifications.module'; // Disabled due to realtime dependency
import { AuthModule } from './core/auth/auth.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
// import { PaymentModule } from './core/integrations/payment/payment.module';
import { SettingsModule } from './modules/settings/settings.module';
// import { PaymentModule as PaymentModuleV2 } from './modules/payment/payment.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EventsModule } from './core/events/events.module';
import { CommonModule } from './common/module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [rateLimitConfig, securityHardeningConfig, databaseConfig, aiMLConfig, integrationConfig, cacheConfig],
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    SecurityModule,
    ObservabilityModule,
    ResilienceModule,
    TestingModule,
    DataModule,
    FeatureFlagsModule,
    InfrastructureModule,
    DevelopmentModule,
    StatusModule,
    DatabaseModule,
    CacheModule,
    EventsModule,
    AuthModule,
    TasksModule,
    MobileModule,
    // AI module temporarily disabled due to circular dependency issues
    ProductsModule,
    OrdersModule,
    CRMModule,
    ERPModule,
    WmsModule,
    TmsModule,
    MarketingModule,
    ContentModule,
    LotManagementModule,
    WarehouseOperationsModule,
    HandheldTerminalModule,
    VehicleTrackingModule,
    AccountingModule,
    SupplierIntegrationModule,
    PricingCampaignsModule,
    // NotificationsModule, // Temporarily disabled due to AI dependency
    WebhookModule,
    // PaymentModule,
    // PaymentModuleV2, // Temporarily disabled due to AI dependency
    InventoryModule,
    SettingsModule,
  ],
  providers: [
    RedisService,
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
  ],
})
export class AppModule {}