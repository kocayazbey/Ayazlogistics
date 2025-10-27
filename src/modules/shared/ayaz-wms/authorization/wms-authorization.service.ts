import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class WmsAuthorizationService {
  private menuAuthorizations: Map<string, any> = new Map();
  private functionAuthorizations: Map<string, any> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  async authorizeClientMenuForUser(data: {
    userId: string;
    menus: Array<{
      menuCode: string;
      menuName: string;
      access: 'full' | 'read_only' | 'execute_only' | 'denied';
      subMenus?: string[];
    }>;
  }, tenantId: string, authorizedBy: string) {
    const authId = `AUTH-USER-${Date.now()}`;
    this.menuAuthorizations.set(authId, { ...data, type: 'user', tenantId, authorizedBy, authorizedAt: new Date() });
    await this.eventBus.emit('menu.user.authorized', { authId, userId: data.userId, tenantId });
    return this.menuAuthorizations.get(authId);
  }

  async authorizeClientMenuForGroup(data: {
    groupId: string;
    menus: Array<{
      menuCode: string;
      access: 'full' | 'read_only' | 'execute_only' | 'denied';
    }>;
  }, tenantId: string, authorizedBy: string) {
    const authId = `AUTH-GROUP-${Date.now()}`;
    this.menuAuthorizations.set(authId, { ...data, type: 'group', tenantId, authorizedBy, authorizedAt: new Date() });
    await this.eventBus.emit('menu.group.authorized', { authId, groupId: data.groupId, tenantId });
    return this.menuAuthorizations.get(authId);
  }

  async authorizeHhMenuForPersonnel(data: {
    personnelId: string;
    hhMenus: Array<{
      menuCode: string;
      menuName: string;
      canView: boolean;
      canExecute: boolean;
      canModify: boolean;
      restrictions?: string[];
    }>;
  }, tenantId: string, authorizedBy: string) {
    const authId = `AUTH-HH-${Date.now()}`;
    this.menuAuthorizations.set(authId, { ...data, type: 'handheld_user', tenantId, authorizedBy, authorizedAt: new Date() });
    await this.eventBus.emit('hh.menu.personnel.authorized', { authId, personnelId: data.personnelId, tenantId });
    return this.menuAuthorizations.get(authId);
  }

  async authorizeHhMenuForGroup(data: {
    groupId: string;
    hhMenus: string[];
  }, tenantId: string, authorizedBy: string) {
    const authId = `AUTH-HH-GRP-${Date.now()}`;
    this.menuAuthorizations.set(authId, { ...data, type: 'handheld_group', tenantId, authorizedBy, authorizedAt: new Date() });
    await this.eventBus.emit('hh.menu.group.authorized', { authId, groupId: data.groupId, tenantId });
    return this.menuAuthorizations.get(authId);
  }

  async authorizeBlockReasons(data: {
    userId: string;
    authorizedReasons: string[];
    canApprove: boolean;
    canReject: boolean;
  }, tenantId: string) {
    const authId = `AUTH-BLK-${Date.now()}`;
    this.functionAuthorizations.set(authId, { ...data, function: 'block_reasons', tenantId, createdAt: new Date() });
    return this.functionAuthorizations.get(authId);
  }

  async authorizePickingAreas(data: {
    userId: string;
    authorizedZones: string[];
    authorizedAisles?: string[];
  }, tenantId: string) {
    const authId = `AUTH-PICK-${Date.now()}`;
    this.functionAuthorizations.set(authId, { ...data, function: 'picking_areas', tenantId, createdAt: new Date() });
    return this.functionAuthorizations.get(authId);
  }

  async authorizeSpecialFunctions(data: {
    userId: string;
    functions: Array<{
      functionCode: string;
      functionName: string;
      level: 'view' | 'execute' | 'approve' | 'admin';
      restrictions?: string[];
    }>;
  }, tenantId: string) {
    const authId = `AUTH-FUNC-${Date.now()}`;
    this.functionAuthorizations.set(authId, { ...data, tenantId, createdAt: new Date() });
    await this.eventBus.emit('special.functions.authorized', { authId, userId: data.userId, tenantId });
    return this.functionAuthorizations.get(authId);
  }

  checkUserAuthorization(userId: string, menuCode: string): boolean {
    const userAuths = Array.from(this.menuAuthorizations.values()).filter(a => a.userId === userId);
    return userAuths.some(auth => auth.menus?.some((m: any) => m.menuCode === menuCode && m.access !== 'denied'));
  }

  checkFunctionAuthorization(userId: string, functionCode: string): boolean {
    const funcAuths = Array.from(this.functionAuthorizations.values()).filter(a => a.userId === userId);
    return funcAuths.some(auth => auth.functions?.some((f: any) => f.functionCode === functionCode));
  }
}

