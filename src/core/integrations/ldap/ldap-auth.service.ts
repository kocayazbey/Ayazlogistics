import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'ldapts';

@Injectable()
export class LDAPAuthService {
  private readonly logger = new Logger(LDAPAuthService.name);
  private client: Client;

  constructor() {
    this.client = new Client({
      url: process.env.LDAP_URL || 'ldap://localhost:389',
    });
  }

  async authenticate(username: string, password: string): Promise<boolean> {
    try {
      const dn = `uid=${username},${process.env.LDAP_BASE_DN}`;
      await this.client.bind(dn, password);
      this.logger.log(`LDAP authentication successful for ${username}`);
      return true;
    } catch (error) {
      this.logger.error(`LDAP authentication failed for ${username}:`, error);
      return false;
    } finally {
      await this.client.unbind();
    }
  }

  async searchUser(username: string): Promise<any> {
    try {
      await this.client.bind(process.env.LDAP_BIND_DN || '', process.env.LDAP_BIND_PASSWORD || '');
      
      const { searchEntries } = await this.client.search(process.env.LDAP_BASE_DN || '', {
        scope: 'sub',
        filter: `(uid=${username})`,
        attributes: ['cn', 'mail', 'memberOf'],
      });

      return searchEntries[0] || null;
    } catch (error) {
      this.logger.error(`LDAP user search failed for ${username}:`, error);
      return null;
    } finally {
      await this.client.unbind();
    }
  }

  async getUserGroups(username: string): Promise<string[]> {
    const user = await this.searchUser(username);
    return user?.memberOf || [];
  }
}

