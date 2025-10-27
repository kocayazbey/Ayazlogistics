import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import { StandardizedDatabaseService } from '../../core/database/standardized-database.service';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/login.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly REFRESH_TOKEN_CACHE_KEY = 'refresh_token:';
  private readonly TOKEN_BLACKLIST_CACHE_KEY = 'token_blacklist:';

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Kullanıcının izinlerini al
    const { roles } = await import('../../database/schema/core/permissions.schema');
    
    const userRolesResult = await this.db
      .select({
        roleName: roles.name,
        permissions: roles.permissions,
      })
      .from(roles)
      .where(eq(roles.name, user.role))
      .limit(1);

    let userPermissions: string[] = [];
    if (userRolesResult.length > 0) {
      const roleData = userRolesResult[0];
      userPermissions = (roleData.permissions as string[]) || [];
    }
    
    // Super admin için tüm izinleri ekle
    if (user.role === 'super_admin') {
      userPermissions = ['all'];
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: userPermissions,
      },
    };
  }

  async register(userData: RegisterDto) {
    try {
      // Import database schema
      const { users } = await import('../../database/schema/core/users.schema');
      
      // Check if user already exists
      const existingUser = await this.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('User with this email already exists');
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user
      const newUser = await this.db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role || 'warehouse_worker',
          tenantId: userData.tenantId || 'tenant-001',
          warehouseId: userData.warehouseId || 'warehouse-001',
          isActive: true,
          permissions: userData.permissions || ['wms'],
        })
        .returning();

      return {
        success: true,
        message: 'Kullanıcı başarıyla kaydedildi',
        data: {
          id: newUser[0].id,
          email: newUser[0].email,
          name: newUser[0].name,
          role: newUser[0].role,
          tenantId: newUser[0].tenantId,
          warehouseId: newUser[0].warehouseId,
          permissions: newUser[0].permissions,
          createdAt: newUser[0].createdAt
        }
      };
    } catch (error) {
      this.logger.error('Error registering user', error);
      throw new Error('Failed to register user');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    try {
      // Import database schema
      const { users } = await import('../../database/schema/core/users.schema');
      
      // Find user by email
      const userResult = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (userResult.length === 0) {
        return null;
      }

      const user = userResult[0];
      
      // Check if user is active
      if (!user.isActive) {
        return null;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      await this.db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Return user without password
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error('Error validating user', error);
      return null;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const user = await this.validateRefreshToken(refreshToken);

      // Generate new token pair
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      // Blacklist old refresh token
      const oldPayload = this.jwtService.decode(refreshToken) as any;
      if (oldPayload?.jti) {
        await this.blacklistToken(oldPayload.jti);
      }

      this.logger.log(`Token refreshed for user: ${user.id}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Refresh token failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, jti?: string) {
    try {
      if (jti) {
        // Blacklist the specific token
        await this.blacklistToken(jti);
        this.logger.log(`User ${userId} logged out, token ${jti} blacklisted`);
      }

      // Invalidate all user sessions (optional - for security)
      // await this.invalidateAllUserTokens(userId);

      return {
        success: true,
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Logout failed for user ${userId}`, error.stack);
      throw new UnauthorizedException('Logout failed');
    }
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.getProfile(payload.sub);

      if (!user) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  async getProfile(userId: string) {
    try {
      // Import database schema
      const { users } = await import('../../database/schema/core/users.schema');
      
      // Find user by ID
      const userResult = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const user = userResult[0];
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        warehouseId: user.warehouseId,
        permissions: user.permissions,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };
    } catch (error) {
      this.logger.error('Error getting user profile', error);
      throw new UnauthorizedException('Failed to get user profile');
    }
  }

  async forgotPassword(email: string) {
    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    return { message: 'Password reset successfully' };
  }

  private generateAccessToken(user: any): string {
    const jti = crypto.randomUUID(); // JWT ID for token tracking

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      name: user.name,
      permissions: user.permissions || [],
      warehouseId: user.warehouseId,
      aud: this.configService.get<string>('JWT_AUDIENCE', 'ayazlogistics-api'),
      iss: this.configService.get<string>('JWT_ISSUER', 'ayazlogistics-auth'),
      jti,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      algorithm: 'HS256',
    });
  }

  private generateRefreshToken(user: any): string {
    const jti = crypto.randomUUID();

    const payload = {
      sub: user.id,
      aud: this.configService.get<string>('JWT_AUDIENCE', 'ayazlogistics-api'),
      iss: this.configService.get<string>('JWT_ISSUER', 'ayazlogistics-auth'),
      jti,
      type: 'refresh',
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      algorithm: 'HS256',
    });

    // Cache refresh token for validation
    this.cacheRefreshToken(user.id, jti, token);

    return token;
  }

  private async cacheRefreshToken(userId: string, jti: string, token: string): Promise<void> {
    const cacheKey = `${this.REFRESH_TOKEN_CACHE_KEY}${userId}:${jti}`;
    await this.cacheManager.set(cacheKey, token, this.CACHE_TTL * 24); // 24 hours
  }

  async blacklistToken(jti: string): Promise<void> {
    const cacheKey = `${this.TOKEN_BLACKLIST_CACHE_KEY}${jti}`;
    await this.cacheManager.set(cacheKey, true, this.CACHE_TTL);
    this.logger.log(`Token blacklisted: ${jti}`);
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    // In a real implementation, this would clear all tokens for a user
    // For now, we'll just log the action
    this.logger.warn(`All tokens invalidated for user: ${userId}`);
  }

  async validateRefreshToken(refreshToken: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        algorithms: ['HS256'],
        audience: this.configService.get<string>('JWT_AUDIENCE', 'ayazlogistics-api'),
        issuer: this.configService.get<string>('JWT_ISSUER', 'ayazlogistics-auth'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      // Check if refresh token is cached
      const cachedToken = await this.getCachedRefreshToken(payload.sub, payload.jti);
      if (cachedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.cacheManager.get(`${this.TOKEN_BLACKLIST_CACHE_KEY}${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      const user = await this.getProfile(payload.sub);
      return user;

    } catch (error) {
      this.logger.error(`Refresh token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async getCachedRefreshToken(userId: string, jti: string): Promise<string | null> {
    const cacheKey = `${this.REFRESH_TOKEN_CACHE_KEY}${userId}:${jti}`;
    return await this.cacheManager.get(cacheKey);
  }
}

