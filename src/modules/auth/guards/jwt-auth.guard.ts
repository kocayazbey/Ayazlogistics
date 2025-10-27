import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      this.logger.warn('Missing authorization header');
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn('Invalid authorization header format');
      throw new UnauthorizedException('Invalid authorization header format');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err) {
      this.logger.error(`JWT authentication error: ${err.message}`, err.stack);
      throw new UnauthorizedException('Authentication failed');
    }

    if (info) {
      this.logger.warn(`JWT validation failed: ${info.message}`);

      if (info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }

      if (info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token format');
      }

      throw new UnauthorizedException('Token validation failed');
    }

    if (!user) {
      this.logger.warn('No user found in token');
      throw new UnauthorizedException('User not found');
    }

    this.logger.debug(`JWT authentication successful for user: ${user.id} (${user.role})`);
    return user;
  }
}

