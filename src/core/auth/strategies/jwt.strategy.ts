import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req: any) => {
        // First try to get token from cookie
        const token = req.cookies?.access_token;
        if (token) {
          return token;
        }
        // Fallback to Authorization header (for backward compatibility)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          return authHeader.substring(7);
        }
        return null;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // For cookie-based auth, we don't need to validate user existence
    // since the token itself is validated by passport-jwt
    return {
      id: payload.sub || payload.userId,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
      tenantId: payload.tenantId,
    };
  }
}