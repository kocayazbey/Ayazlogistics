import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as saml2 from 'saml2-js';
import { JwtService } from '@nestjs/jwt';

interface SSOConfig {
  provider: 'saml' | 'oauth2';
  idpMetadataUrl?: string;
  idpSsoUrl?: string;
  idpCertificate?: string;
  entityId: string;
  assertionConsumerServiceUrl: string;
  singleLogoutServiceUrl?: string;
}

interface SSOUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
  attributes?: Record<string, any>;
}

@Injectable()
export class SSOService {
  private readonly logger = new Logger(SSOService.name);
  private readonly samlServiceProvider: saml2.ServiceProvider | null = null;
  private readonly samlIdentityProvider: saml2.IdentityProvider | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.initializeSAML();
  }

  private initializeSAML(): void {
    try {
      const entityId = this.configService.get<string>('SAML_ENTITY_ID');
      const acsUrl = this.configService.get<string>('SAML_ACS_URL');
      const idpSsoUrl = this.configService.get<string>('SAML_IDP_SSO_URL');
      const idpCertificate = this.configService.get<string>('SAML_IDP_CERTIFICATE');

      if (!entityId || !acsUrl || !idpSsoUrl) {
        this.logger.warn('SAML not configured, SSO will not be available');
        return;
      }

      const sp = new saml2.ServiceProvider({
        entity_id: entityId,
        private_key: this.configService.get<string>('SAML_SP_PRIVATE_KEY') || '',
        certificate: this.configService.get<string>('SAML_SP_CERTIFICATE') || '',
        assert_endpoint: acsUrl,
      });

      const idp = new saml2.IdentityProvider({
        sso_login_url: idpSsoUrl,
        sso_logout_url: this.configService.get<string>('SAML_IDP_SLO_URL') || '',
        certificates: [idpCertificate || ''],
      });

      (this as any).samlServiceProvider = sp;
      (this as any).samlIdentityProvider = idp;

      this.logger.log('SAML SSO initialized');
    } catch (error: any) {
      this.logger.error(`SAML initialization failed: ${error.message}`);
    }
  }

  async generateSAMLLoginUrl(relayState?: string): Promise<string> {
    if (!this.samlServiceProvider || !this.samlIdentityProvider) {
      throw new Error('SAML not configured');
    }

    return new Promise((resolve, reject) => {
      (this.samlServiceProvider as any).create_login_request_url(
        this.samlIdentityProvider,
        { relay_state: relayState },
        (err: Error | null, loginUrl: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(loginUrl);
          }
        },
      );
    });
  }

  async processSAMLResponse(samlResponse: string): Promise<SSOUser> {
    if (!this.samlServiceProvider || !this.samlIdentityProvider) {
      throw new Error('SAML not configured');
    }

    return new Promise((resolve, reject) => {
      const options = { request_body: { SAMLResponse: samlResponse } };

      (this.samlServiceProvider as any).post_assert(
        this.samlIdentityProvider,
        options,
        (err: Error | null, samlAssertion: any) => {
          if (err) {
            reject(new UnauthorizedException('SAML assertion failed'));
          } else {
            const user: SSOUser = {
              id: samlAssertion.user.name_id,
              email: samlAssertion.user.email || samlAssertion.user.name_id,
              firstName: samlAssertion.user.given_name,
              lastName: samlAssertion.user.surname,
              roles: samlAssertion.user.roles || [],
              attributes: samlAssertion.user.attributes || {},
            };

            resolve(user);
          }
        },
      );
    });
  }

  async generateSAMLLogoutUrl(nameId: string, sessionIndex: string): Promise<string> {
    if (!this.samlServiceProvider || !this.samlIdentityProvider) {
      throw new Error('SAML not configured');
    }

    return new Promise((resolve, reject) => {
      (this.samlServiceProvider as any).create_logout_request_url(
        this.samlIdentityProvider,
        { name_id: nameId, session_index: sessionIndex },
        (err: Error | null, logoutUrl: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(logoutUrl);
          }
        },
      );
    });
  }

  async createInternalToken(ssoUser: SSOUser, tenantId: string): Promise<string> {
    const payload = {
      sub: ssoUser.id,
      email: ssoUser.email,
      firstName: ssoUser.firstName,
      lastName: ssoUser.lastName,
      roles: ssoUser.roles,
      tenantId,
      authMethod: 'sso',
    };

    return this.jwtService.sign(payload, { expiresIn: '8h' });
  }

  async validateOAuth2Token(accessToken: string, provider: string): Promise<SSOUser | null> {
    try {
      let userInfoUrl = '';

      switch (provider) {
        case 'google':
          userInfoUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
          break;
        case 'microsoft':
          userInfoUrl = 'https://graph.microsoft.com/v1.0/me';
          break;
        case 'azure_ad':
          userInfoUrl = 'https://graph.microsoft.com/v1.0/me';
          break;
        default:
          throw new Error(`Unknown OAuth2 provider: ${provider}`);
      }

      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const userInfo = await response.json();

      return {
        id: userInfo.sub || userInfo.id,
        email: userInfo.email,
        firstName: userInfo.given_name || userInfo.givenName,
        lastName: userInfo.family_name || userInfo.surname,
      };
    } catch (error: any) {
      this.logger.error(`OAuth2 token validation failed: ${error.message}`);
      return null;
    }
  }
}

