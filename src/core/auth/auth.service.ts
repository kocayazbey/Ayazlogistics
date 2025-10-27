import { Injectable, UnauthorizedException, ConflictException, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DRIZZLE_ORM } from '../database/database.constants';
import { StandardizedDatabaseService } from '../database/standardized-database.service';
import { users, refreshTokens } from '../../database/schema/core/users.schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, role } = registerDto;

    // Check if user already exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [savedUser] = await this.db
      .insert(users)
      .values({
        email,
        passwordHash: hashedPassword,
        name: name,
        role: role || 'customer',
      })
      .returning();

    if (!savedUser) {
      throw new Error('Failed to create user');
    }

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    return {
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const refreshSecret = this.configService.get('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new UnauthorizedException('JWT refresh secret not configured');
      }
      
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: refreshSecret,
      });

      const userResult = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);
      
      if (userResult.length === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = userResult[0];
      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const userResult = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userResult.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const user = userResult[0];
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const userResult = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];
    if (!user) {
      return null;
    }
    
    if (await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash: _, ...result } = user;
      return result;
    }
    return null;
  }

  private async generateTokens(user: any) {
    const tokenId = crypto.randomUUID();
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      jti: tokenId
    };

    const jwtSecret = this.configService.get('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret as string,
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret as string,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    // Store refresh token in database
    await this.storeRefreshToken(
      user.id,
      refreshToken,
      tokenId,
      this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d')
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user from database
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long');
    }

    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.db
      .update(users)
      .set({
        passwordHash: hashedNewPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async forgotPassword(email: string): Promise<void> {
    // Check if user exists
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user.length === 0) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset token (implement token generation)
    // Send email with reset link (implement email service)
    // For now, just log the action
    console.log(`Password reset requested for email: ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Validate new password
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Verify token and find user (implement token verification)
    // Hash new password and update user
    // For now, just log the action
    console.log(`Password reset with token: ${token}`);
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    // Implement token invalidation logic
    // For example, update user's token version or blacklist all tokens
    console.log(`Invalidating all tokens for user: ${userId}`);
  }

  async refreshTokenForUser(userId: string, tokenId?: string): Promise<{ access_token: string; refresh_token: string }> {
    // Get user from database
    const user = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const dbUser = user[0];

    // Generate new tokens
    const payload = {
      sub: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      jti: tokenId || 'refreshed',
    };

    const jwtSecret = this.configService.get('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || jwtSecret;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret as string,
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret as string,
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET');

      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: jwtRefreshSecret as string,
      });

      if (!payload.sub || !payload.email || !payload.role || !payload.jti) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      // Check if refresh token exists in database and is not revoked
      const tokenHash = this.hashToken(refreshToken);
      const storedToken = await this.db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            eq(refreshTokens.tokenId, payload.jti),
            eq(refreshTokens.isRevoked, false),
            gte(refreshTokens.expiresAt, new Date())
          )
        )
        .limit(1);

      if (storedToken.length === 0) {
        throw new UnauthorizedException('Refresh token not found or revoked');
      }

      // Get user from database to ensure they still exist and are active
      const user = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (user.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      if (!user[0].isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      // Mark current refresh token as used and create new one
      await this.db
        .update(refreshTokens)
        .set({
          lastUsedAt: new Date(),
          isRevoked: true, // One-time use tokens
        })
        .where(eq(refreshTokens.id, storedToken[0].id));

      // Generate new tokens
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        jti: crypto.randomUUID(),
      };

      const jwtSecret = this.configService.get('JWT_SECRET');
      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, {
          secret: jwtSecret as string,
          expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
        }),
        this.jwtService.signAsync(newPayload, {
          secret: jwtRefreshSecret as string,
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        }),
      ]);

      // Store new refresh token in database
      await this.storeRefreshToken(
        payload.sub,
        newRefreshToken,
        newPayload.jti,
        this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d')
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Refresh token validation failed:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private verifyRefreshToken(refreshToken: string): any {
    const jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET');

    return this.jwtService.verify(refreshToken, {
      secret: jwtRefreshSecret as string,
    });
  }

  private generateAccessToken(payload: any): string {
    const jwtSecret = this.configService.get('JWT_SECRET');

    return this.jwtService.sign(payload, {
      secret: jwtSecret as string,
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
    });
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
    tokenId: string,
    expiresIn: string
  ): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();

    // Parse expiresIn (e.g., "7d", "24h", "1h")
    const duration = this.parseDuration(expiresIn);
    expiresAt.setTime(expiresAt.getTime() + duration);

    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      tokenId,
      expiresAt,
      isRevoked: false,
      deviceInfo: {
        userAgent: 'web-app', // TODO: Extract from request
        platform: 'web',
      },
      ipAddress: 'unknown', // TODO: Extract from request
    });
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const [, value, unit] = match;
    const numValue = parseInt(value);

    switch (unit) {
      case 's': return numValue * 1000;
      case 'm': return numValue * 60 * 1000;
      case 'h': return numValue * 60 * 60 * 1000;
      case 'd': return numValue * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  async revokeUserTokens(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  async revokeToken(tokenId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenId, tokenId));
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db
      .delete(refreshTokens)
      .where(
        and(
          lt(refreshTokens.expiresAt, new Date()),
          eq(refreshTokens.isRevoked, true)
        )
      );

    return result.rowCount || 0;
  }

  // Cleanup expired tokens every hour
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredTokensCleanup() {
    try {
      const deletedCount = await this.cleanupExpiredTokens();
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens:', error);
    }
  }

  // Revoke all user tokens on logout from all devices
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({
        isRevoked: true,
        lastUsedAt: new Date()
      })
      .where(eq(refreshTokens.userId, userId));
  }
}