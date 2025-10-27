import { Injectable, Logger } from '@nestjs/common';
import * as saml2 from 'saml2-js';

@Injectable()
export class SAMLService {
  private readonly logger = new Logger(SAMLService.name);
  private serviceProvider: saml2.ServiceProvider;
  private identityProvider: saml2.IdentityProvider;

  constructor() {
    this.serviceProvider = new saml2.ServiceProvider({
      entity_id: process.env.SAML_SP_ENTITY_ID || 'https://app.ayazlogistics.com',
      private_key: process.env.SAML_SP_PRIVATE_KEY || '',
      certificate: process.env.SAML_SP_CERTIFICATE || '',
      assert_endpoint: process.env.SAML_ASSERT_ENDPOINT || 'https://app.ayazlogistics.com/saml/assert',
    });

    this.identityProvider = new saml2.IdentityProvider({
      sso_login_url: process.env.SAML_IDP_SSO_URL || '',
      sso_logout_url: process.env.SAML_IDP_LOGOUT_URL || '',
      certificates: [process.env.SAML_IDP_CERTIFICATE || ''],
    });

    this.logger.log('SAML service initialized');
  }

  async createLoginRequest(callback: (err: any, loginUrl: string) => void): Promise<void> {
    this.serviceProvider.create_login_request_url(this.identityProvider, {}, callback);
  }

  async assertResponse(response: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.serviceProvider.post_assert(this.identityProvider, { request_body: response }, (err, samlResponse) => {
        if (err) {
          this.logger.error('SAML assertion failed:', err);
          reject(err);
        } else {
          this.logger.log(`SAML user authenticated: ${samlResponse.user.name_id}`);
          resolve(samlResponse.user);
        }
      });
    });
  }

  async createLogoutRequest(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.serviceProvider.create_logout_request_url(this.identityProvider, {}, (err, logoutUrl) => {
        if (err) reject(err);
        else resolve(logoutUrl);
      });
    });
  }
}

