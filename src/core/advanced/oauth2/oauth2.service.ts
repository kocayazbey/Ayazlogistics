import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

interface OAuth2Client {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  grants: string[];
  scopes: string[];
}

interface AuthorizationCode {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: Date;
}

@Injectable()
export class OAuth2Service {
  private readonly logger = new Logger(OAuth2Service.name);
  private clients = new Map<string, OAuth2Client>();
  private authCodes = new Map<string, AuthorizationCode>();

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  registerClient(client: OAuth2Client): void {
    this.clients.set(client.clientId, client);
    this.logger.log(`OAuth2 client registered: ${client.clientId}`);
  }

  async generateAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scopes: string[],
  ): Promise<string> {
    const client = this.clients.get(clientId);
    if (!client) throw new Error('Invalid client');
    if (!client.redirectUris.includes(redirectUri)) throw new Error('Invalid redirect URI');

    const code = crypto.randomBytes(32).toString('hex');
    const authCode: AuthorizationCode = {
      code,
      clientId,
      userId,
      redirectUri,
      scopes,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    this.authCodes.set(code, authCode);
    this.logger.log(`Authorization code generated for user ${userId}`);
    
    setTimeout(() => this.authCodes.delete(code), 10 * 60 * 1000);
    return code;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const client = this.clients.get(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      throw new Error('Invalid client credentials');
    }

    const authCode = this.authCodes.get(code);
    if (!authCode) throw new Error('Invalid authorization code');
    if (authCode.clientId !== clientId) throw new Error('Client mismatch');
    if (authCode.redirectUri !== redirectUri) throw new Error('Redirect URI mismatch');
    if (authCode.expiresAt < new Date()) throw new Error('Authorization code expired');

    this.authCodes.delete(code);

    const accessToken = jwt.sign(
      { userId: authCode.userId, scopes: authCode.scopes, type: 'access' },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: authCode.userId, scopes: authCode.scopes, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: '30d' }
    );

    this.logger.log(`Token issued for user ${authCode.userId}`);

    return { accessToken, refreshToken, expiresIn: 3600 };
  }
}

