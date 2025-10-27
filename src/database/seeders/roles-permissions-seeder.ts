import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { roles, permissions, userRoles } from '../schema/core/permissions.schema';
import { users } from '../schema/core/users.schema';
import { tenants } from '../schema/core/tenants.schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RolesPermissionsSeeder {
  private readonly logger = new Logger(RolesPermissionsSeeder.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async seed() {
    this.logger.log('Roller ve izinler seed ediliyor...');
    
    // Önce default tenant'ı oluştur
    await this.ensureDefaultTenant();
    
    // İzinleri seed et
    await this.seedPermissions();
    
    // Rolleri seed et
    await this.seedRoles();
    
    // Kullanıcıları seed et
    await this.seedUsers();
    
    this.logger.log('Roller ve izinler başarıyla seed edildi!');
  }

  private async ensureDefaultTenant() {
    const [existingTenant] = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, 'default-tenant'))
      .limit(1);

    if (!existingTenant) {
      await this.db.insert(tenants).values({
        id: 'default-tenant',
        name: 'Ayaz Logistics',
        domain: 'ayazlogistics.com',
        isActive: true,
      });
      this.logger.log('Default tenant oluşturuldu');
    }
  }

  private async seedPermissions() {
    const permissionList = [
      // Dashboard
      { name: 'view_dashboard', description: 'Dashboard görüntüleme', category: 'dashboard' },
      
      // Warehouse
      { name: 'manage_warehouse', description: 'Depo yönetimi', category: 'warehouse' },
      { name: 'manage_stocks', description: 'Stok yönetimi', category: 'warehouse' },
      { name: 'manage_lots', description: 'Lot ve batch yönetimi', category: 'warehouse' },
      { name: 'view_warehouse', description: 'Depo görüntüleme', category: 'warehouse' },
      
      // Logistics
      { name: 'manage_logistics', description: 'Lojistik yönetimi', category: 'logistics' },
      { name: 'manage_vehicles', description: 'Araç yönetimi', category: 'logistics' },
      { name: 'manage_routes', description: 'Rota yönetimi', category: 'logistics' },
      { name: 'tracking', description: 'Takip', category: 'logistics' },
      
      // Suppliers
      { name: 'manage_suppliers', description: 'Tedarikçi yönetimi', category: 'suppliers' },
      { name: 'manage_orders', description: 'Sipariş yönetimi', category: 'suppliers' },
      { name: 'sync_stock', description: 'Stok senkronizasyonu', category: 'suppliers' },
      
      // Finance
      { name: 'manage_finance', description: 'Finans yönetimi', category: 'finance' },
      { name: 'manage_invoices', description: 'Fatura yönetimi', category: 'finance' },
      { name: 'reports', description: 'Rapor görüntüleme', category: 'finance' },
      { name: 'accounts', description: 'Hesap yönetimi', category: 'finance' },
      
      // Settings
      { name: 'manage_settings', description: 'Sistem ayarları', category: 'settings' },
      { name: 'users', description: 'Kullanıcı yönetimi', category: 'settings' },
      { name: 'roles', description: 'Rol yönetimi', category: 'settings' },
      { name: 'integrations', description: 'Entegrasyon yönetimi', category: 'settings' },
      
      // System
      { name: 'all', description: 'Tüm izinler', category: 'system' },
    ];

    for (const perm of permissionList) {
      const [existing] = await this.db
        .select()
        .from(permissions)
        .where(eq(permissions.resource, perm.name))
        .limit(1);

      if (!existing) {
        await this.db.insert(permissions).values({
          resource: perm.name,
          action: 'access',
          description: perm.description,
        });
      }
    }
    this.logger.log(`${permissionList.length} izin seed edildi`);
  }

  private async seedRoles() {
    const roleDefinitions = [
      {
        name: 'super_admin',
        description: 'Sistem yöneticisi - tüm yetkilere sahip',
        isSystem: true,
        permissions: ['all'],
      },
      {
        name: 'warehouse_manager',
        description: 'Depo yöneticisi - stok ve depo yönetimi',
        isSystem: true,
        permissions: ['manage_stocks', 'manage_lots', 'view_warehouse', 'manage_warehouse'],
      },
      {
        name: 'logistics_manager',
        description: 'Lojistik yöneticisi - araç ve rota yönetimi',
        isSystem: true,
        permissions: ['manage_vehicles', 'manage_routes', 'tracking', 'manage_logistics'],
      },
      {
        name: 'finance',
        description: 'Mali işler - fatura ve muhasebe yönetimi',
        isSystem: true,
        permissions: ['manage_invoices', 'reports', 'accounts', 'manage_finance'],
      },
      {
        name: 'supplier_relation',
        description: 'Tedarikçi ilişkileri - sipariş ve stok senkronizasyonu',
        isSystem: true,
        permissions: ['manage_orders', 'sync_stock', 'manage_suppliers'],
      },
      {
        name: 'it_admin',
        description: 'IT yöneticisi - kullanıcı ve sistem yönetimi',
        isSystem: true,
        permissions: ['users', 'roles', 'integrations', 'manage_settings'],
      },
    ];

    for (const roleData of roleDefinitions) {
      const [existing] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.name, roleData.name))
        .limit(1);

      if (!existing) {
        const [newRole] = await this.db
          .insert(roles)
          .values({
            tenantId: 'default-tenant',
            name: roleData.name,
            description: roleData.description,
            isSystem: roleData.isSystem,
            permissions: roleData.permissions,
          })
          .returning();

        this.logger.log(`Rol oluşturuldu: ${roleData.name}`);
      }
    }
  }

  private async seedUsers() {
    const userDefinitions = [
      {
        email: 'admin@ayazlogistics.com',
        password: 'admin123',
        name: 'Super Admin',
        role: 'super_admin',
      },
      {
        email: 'warehouse@ayazlogistics.com',
        password: 'warehouse123',
        name: 'Warehouse Manager',
        role: 'warehouse_manager',
      },
      {
        email: 'logistics@ayazlogistics.com',
        password: 'logistics123',
        name: 'Logistics Manager',
        role: 'logistics_manager',
      },
      {
        email: 'finance@ayazlogistics.com',
        password: 'finance123',
        name: 'Finance Manager',
        role: 'finance',
      },
      {
        email: 'supplier@ayazlogistics.com',
        password: 'supplier123',
        name: 'Supplier Manager',
        role: 'supplier_relation',
      },
      {
        email: 'it@ayazlogistics.com',
        password: 'it123',
        name: 'IT Admin',
        role: 'it_admin',
      },
    ];

    for (const userData of userDefinitions) {
      const [existing] = await this.db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (!existing) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const [newUser] = await this.db
          .insert(users)
          .values({
            email: userData.email,
            passwordHash: hashedPassword,
            name: userData.name,
            role: userData.role,
            tenantId: 'default-tenant',
            isActive: true,
          })
          .returning();

        // Role assignment için userRoles tablosuna ekle
        const [userRole] = await this.db
          .select()
          .from(roles)
          .where(eq(roles.name, userData.role))
          .limit(1);

        if (userRole) {
          await this.db.insert(userRoles).values({
            userId: newUser.id,
            roleId: userRole.id,
          });
        }

        this.logger.log(`Kullanıcı oluşturuldu: ${userData.email}`);
      }
    }
  }
}

