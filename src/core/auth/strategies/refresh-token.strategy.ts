import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'refresh-token') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: (req: any) => {
        // Get refresh token from cookie
        const token = req.cookies?.refresh_token;
        if (token) {
          return token;
        }
        // Fallback to body (for backward compatibility)
        return req.body?.refreshToken;
      },
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET') || configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub || payload.userId,
      email: payload.email,
      role: payload.role,
      tokenId: payload.jti,
    };
  }
}
