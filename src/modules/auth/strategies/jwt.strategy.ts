import { Injectable, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  name: string;
  permissions: string[];
  warehouseId: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
  jti: string; // JWT ID for token tracking
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly BLACKLIST_CACHE_KEY = 'token_blacklist:';

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      audience: configService.get<string>('JWT_AUDIENCE', 'ayazlogistics-api'),
      issuer: configService.get<string>('JWT_ISSUER', 'ayazlogistics-auth'),
      algorithms: ['HS256'],
    });

    this.logger.log('JWT Strategy initialized with secure configuration');
  }

  async validate(payload: JwtPayload) {
    // Validate audience
    if (payload.aud !== this.configService.get<string>('JWT_AUDIENCE', 'ayazlogistics-api')) {
      this.logger.warn(`Invalid audience in token: ${payload.aud}`);
      throw new UnauthorizedException('Invalid token audience');
    }

    // Validate issuer
    if (payload.iss !== this.configService.get<string>('JWT_ISSUER', 'ayazlogistics-auth')) {
      this.logger.warn(`Invalid issuer in token: ${payload.iss}`);
      throw new UnauthorizedException('Invalid token issuer');
    }

    // Check if token is blacklisted
    const isBlacklisted = await this.isTokenBlacklisted(payload.jti);
    if (isBlacklisted) {
      this.logger.warn(`Blacklisted token used: ${payload.jti}`);
      throw new UnauthorizedException('Token has been revoked');
    }

    // Check if user still exists and is active (optional - add if needed)
    // const user = await this.validateUserStatus(payload.sub);

    this.logger.debug(`JWT validated for user: ${payload.sub}, role: ${payload.role}`);

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
      name: payload.name,
      permissions: payload.permissions || [],
      warehouseId: payload.warehouseId,
      jti: payload.jti,
    };
  }

  private async isTokenBlacklisted(jti: string): Promise<boolean> {
    const cacheKey = `${this.BLACKLIST_CACHE_KEY}${jti}`;
    const blacklisted = await this.cacheManager.get(cacheKey);
    return !!blacklisted;
  }

  async blacklistToken(jti: string): Promise<void> {
    const cacheKey = `${this.BLACKLIST_CACHE_KEY}${jti}`;
    await this.cacheManager.set(cacheKey, true, this.CACHE_TTL);
    this.logger.log(`Token blacklisted: ${jti}`);
  }

  async isTokenValid(jti: string): Promise<boolean> {
    return !await this.isTokenBlacklisted(jti);
  }
}

