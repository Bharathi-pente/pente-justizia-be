import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import {
  KeycloakConnectModule,
  AuthGuard,
  ResourceGuard,
} from "nest-keycloak-connect";

// Config
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import { keycloakConfig } from "./config/keycloak.config";
import redisConfig from "./config/redis.config";
import s3Config from "./config/s3.config";

// Common
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";
import { RequestContextMiddleware } from "./common/middleware/request-context.middleware";
import { KeycloakAuthGuard } from "./common/guards/keycloak-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { CellScopeGuard } from "./common/guards/cell-scope.guard";

// Modules
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./database/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CellsModule } from "./modules/cells/cells.module";
import { ClioModule } from "./modules/clio/clio.module";
import { CasesModule } from "./modules/cases/cases.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { AuditModule } from "./modules/audit/audit.module";
import { FundingModule } from "./modules/funding/funding.module";
import { InsuranceModule } from "./modules/insurance/insurance.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { QueuesModule } from "./queues/queues.module";

// Entities (for AuditLogInterceptor)
import { AuditLog } from "./modules/audit/entities/audit-log.entity";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, s3Config],
    }),

    // Database
    // TypeOrmModule.forRootAsync({
    //   useFactory: () => databaseConfig(),
    // }),

    // Prisma (new ORM - replacing TypeORM)
    PrismaModule,

    // Keycloak
    KeycloakConnectModule.registerAsync({
      useFactory: () => keycloakConfig(),
    }),

    // TypeORM features for global interceptors
    // TypeOrmModule.forFeature([AuditLog]), // Temporarily disabled - migrating to Prisma

    // Feature Modules
    QueuesModule,
    AuthModule,
    // UsersModule, // Temporarily disabled - needs Prisma migration
    // CellsModule, // Temporarily disabled - needs Prisma migration
    // ClioModule, // Temporarily disabled - needs Prisma migration
    // CasesModule, // Temporarily disabled - needs Prisma migration
    // ComplianceModule, // Temporarily disabled - needs Prisma migration
    // AuditModule, // Temporarily disabled - needs Prisma migration
    // FundingModule, // Temporarily disabled - needs Prisma migration
    // InsuranceModule, // Temporarily disabled - needs Prisma migration
    // DashboardModule, // Temporarily disabled - depends on other modules
    // NotificationsModule, // Temporarily disabled - depends on other modules
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: AuthGuard, // Keycloak default guard
    },
    {
      provide: APP_GUARD,
      useClass: ResourceGuard, // Keycloak resource guard
    },
    // Global Interceptor
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: AuditLogInterceptor, // Temporarily disabled - requires TypeORM migration
    // },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
