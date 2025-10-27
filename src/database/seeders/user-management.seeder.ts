import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../entities/user-role.entity';
import { RolePermission } from '../entities/role-permission.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserManagementSeeder {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async seed() {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedUsers();
  }

  private async seedPermissions() {
    const permissions = [
      // Dashboard permissions
      { name: 'view_dashboard', description: 'View dashboard', category: 'dashboard' },
      
      // Warehouse permissions
      { name: 'manage_warehouse', description: 'Manage warehouse operations', category: 'warehouse' },
      { name: 'manage_stocks', description: 'Manage stock levels', category: 'warehouse' },
      { name: 'manage_lots', description: 'Manage lots and batches', category: 'warehouse' },
      { name: 'view_warehouse', description: 'View warehouse information', category: 'warehouse' },
      
      // Logistics permissions
      { name: 'manage_logistics', description: 'Manage logistics operations', category: 'logistics' },
      { name: 'manage_vehicles', description: 'Manage vehicles', category: 'logistics' },
      { name: 'manage_routes', description: 'Manage routes', category: 'logistics' },
      { name: 'tracking', description: 'Track shipments', category: 'logistics' },
      
      // Supplier permissions
      { name: 'manage_suppliers', description: 'Manage suppliers', category: 'suppliers' },
      { name: 'manage_orders', description: 'Manage orders', category: 'suppliers' },
      { name: 'sync_stock', description: 'Sync stock with suppliers', category: 'suppliers' },
      
      // Finance permissions
      { name: 'manage_finance', description: 'Manage finance operations', category: 'finance' },
      { name: 'manage_invoices', description: 'Manage invoices', category: 'finance' },
      { name: 'reports', description: 'View reports', category: 'finance' },
      { name: 'accounts', description: 'Manage accounts', category: 'finance' },
      
      // Settings permissions
      { name: 'manage_settings', description: 'Manage system settings', category: 'settings' },
      { name: 'users', description: 'Manage users', category: 'settings' },
      { name: 'roles', description: 'Manage roles', category: 'settings' },
      { name: 'integrations', description: 'Manage integrations', category: 'settings' },
      
      // All permissions
      { name: 'all', description: 'All permissions', category: 'system' },
    ];

    for (const permissionData of permissions) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { name: permissionData.name }
      });

      if (!existingPermission) {
        const permission = this.permissionRepository.create({
          ...permissionData,
          tenantId: 'default-tenant'
        });
        await this.permissionRepository.save(permission);
      }
    }
  }

  private async seedRoles() {
    const roles = [
      {
        name: 'super_admin',
        description: 'Sistem yöneticisi - tüm yetkilere sahip',
        isSystem: true,
        permissions: ['all']
      },
      {
        name: 'warehouse_manager',
        description: 'Depo yöneticisi - stok ve depo yönetimi',
        isSystem: true,
        permissions: ['manage_stocks', 'manage_lots', 'view_warehouse', 'manage_warehouse']
      },
      {
        name: 'logistics_manager',
        description: 'Lojistik yöneticisi - araç ve rota yönetimi',
        isSystem: true,
        permissions: ['manage_vehicles', 'manage_routes', 'tracking', 'manage_logistics']
      },
      {
        name: 'finance',
        description: 'Mali işler - fatura ve muhasebe yönetimi',
        isSystem: true,
        permissions: ['manage_invoices', 'reports', 'accounts', 'manage_finance']
      },
      {
        name: 'supplier_relation',
        description: 'Tedarikçi ilişkileri - sipariş ve stok senkronizasyonu',
        isSystem: true,
        permissions: ['manage_orders', 'sync_stock', 'manage_suppliers']
      },
      {
        name: 'it_admin',
        description: 'IT yöneticisi - kullanıcı ve sistem yönetimi',
        isSystem: true,
        permissions: ['users', 'roles', 'integrations', 'manage_settings']
      }
    ];

    for (const roleData of roles) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name }
      });

      if (!existingRole) {
        const role = this.roleRepository.create({
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
          tenantId: 'default-tenant'
        });

        const savedRole = await this.roleRepository.save(role);

        // Assign permissions to role
        for (const permissionName of roleData.permissions) {
          const permission = await this.permissionRepository.findOne({
            where: { name: permissionName }
          });

          if (permission) {
            const rolePermission = this.rolePermissionRepository.create({
              roleId: savedRole.id,
              permissionId: permission.id,
              assignedBy: 'system'
            });

            await this.rolePermissionRepository.save(rolePermission);
          }
        }
      }
    }
  }

  private async seedUsers() {
    const users = [
      {
        email: 'admin@ayazlogistics.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'super_admin',
        phone: '+90 212 555 0001',
        department: 'IT'
      },
      {
        email: 'warehouse@ayazlogistics.com',
        password: 'warehouse123',
        firstName: 'Warehouse',
        lastName: 'Manager',
        role: 'warehouse_manager',
        phone: '+90 212 555 0002',
        department: 'Warehouse'
      },
      {
        email: 'logistics@ayazlogistics.com',
        password: 'logistics123',
        firstName: 'Logistics',
        lastName: 'Manager',
        role: 'logistics_manager',
        phone: '+90 212 555 0003',
        department: 'Logistics'
      },
      {
        email: 'finance@ayazlogistics.com',
        password: 'finance123',
        firstName: 'Finance',
        lastName: 'Manager',
        role: 'finance',
        phone: '+90 212 555 0004',
        department: 'Finance'
      },
      {
        email: 'supplier@ayazlogistics.com',
        password: 'supplier123',
        firstName: 'Supplier',
        lastName: 'Manager',
        role: 'supplier_relation',
        phone: '+90 212 555 0005',
        department: 'Procurement'
      },
      {
        email: 'it@ayazlogistics.com',
        password: 'it123',
        firstName: 'IT',
        lastName: 'Admin',
        role: 'it_admin',
        phone: '+90 212 555 0006',
        department: 'IT'
      }
    ];

    for (const userData of users) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email }
      });

      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const user = this.userRepository.create({
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          department: userData.department,
          isActive: true,
          tenantId: 'default-tenant',
          createdBy: 'system'
        });

        const savedUser = await this.userRepository.save(user);

        // Assign role to user
        const role = await this.roleRepository.findOne({
          where: { name: userData.role }
        });

        if (role) {
          const userRole = this.userRoleRepository.create({
            userId: savedUser.id,
            roleId: role.id,
            assignedBy: 'system'
          });

          await this.userRoleRepository.save(userRole);
        }
      }
    }
  }
}
