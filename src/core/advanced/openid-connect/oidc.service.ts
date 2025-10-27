import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

interface OIDCProvider {
  name: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  jwksUri: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface OIDCTokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

interface OIDCUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string;
  locale?: string;
}

@Injectable()
export class OIDCService {
  private readonly logger = new Logger(OIDCService.name);

  private providers: Map<string, OIDCProvider> = new Map();

  constructor() {
    this.registerProviders();
  }

  private registerProviders(): void {
    this.providers.set('google', {
      name: 'Google',
      issuer: 'https://accounts.google.com',
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      userInfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: `${process.env.APP_URL}/auth/oidc/callback`,
      scopes: ['openid', 'email', 'profile'],
    });

    this.providers.set('azure', {
      name: 'Azure AD',
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      authorizationEndpoint: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
      tokenEndpoint: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      userInfoEndpoint: 'https://graph.microsoft.com/oidc/userinfo',
      jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      redirectUri: `${process.env.APP_URL}/auth/oidc/callback`,
      scopes: ['openid', 'email', 'profile'],
    });
  }

  getAuthorizationUrl(providerName: string, state: string): string {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`OIDC provider not found: ${providerName}`);
    }

    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      state,
      nonce: this.generateNonce(),
    });

    return `${provider.authorizationEndpoint}?${params.toString()}`;
  }

  async exchangeCodeForTokens(providerName: string, code: string): Promise<OIDCTokenResponse> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`OIDC provider not found: ${providerName}`);
    }

    try {
      const response = await axios.post(
        provider.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: provider.redirectUri,
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return {
        accessToken: response.data.access_token,
        idToken: response.data.id_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      this.logger.error('Token exchange failed:', error);
      throw error;
    }
  }

  async getUserInfo(providerName: string, accessToken: string): Promise<OIDCUserInfo> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`OIDC provider not found: ${providerName}`);
    }

    try {
      const response = await axios.get(provider.userInfoEndpoint, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      return {
        sub: response.data.sub,
        email: response.data.email,
        emailVerified: response.data.email_verified || false,
        name: response.data.name,
        picture: response.data.picture,
        locale: response.data.locale,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error);
      throw error;
    }
  }

  async verifyIdToken(providerName: string, idToken: string): Promise<any> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`OIDC provider not found: ${providerName}`);
    }

    const decoded = jwt.decode(idToken, { complete: true });

    if (!decoded) {
      throw new Error('Invalid ID token');
    }

    return decoded.payload;
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  async refreshAccessToken(providerName: string, refreshToken: string): Promise<OIDCTokenResponse> {
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`OIDC provider not found: ${providerName}`);
    }

    try {
      const response = await axios.post(
        provider.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return {
        accessToken: response.data.access_token,
        idToken: response.data.id_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
      };
    } catch (error) {
      this.logger.error('Token refresh failed:', error);
      throw error;
    }
  }
}

