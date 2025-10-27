import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { WmsPermissionGuard } from '../../modules/auth/guards/wms-permission.guard';
import { PermissionsGuard } from '../../modules/auth/guards/permissions.guard';
import { RbacGuard } from '../../modules/auth/guards/rbac.guard';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    CacheModule.register(),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '1h'),
          algorithm: 'HS256',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    RefreshTokenStrategy,
    WmsPermissionGuard,
    PermissionsGuard,
    RbacGuard,
  ],
  exports: [
    AuthService,
    WmsPermissionGuard,
    PermissionsGuard,
    RbacGuard,
  ],
})
export class AuthModule {}