import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { Role } from '../../../database/entities/role.entity';
import { Permission } from '../../../database/entities/permission.entity';
import { UserRole } from '../../../database/entities/user-role.entity';
import { RolePermission } from '../../../database/entities/role-permission.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserManagementService {
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

  async getUsers(tenantId: string, filter: any) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('user.tenantId = :tenantId', { tenantId });

    if (filter.search) {
      queryBuilder.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    if (filter.role) {
      queryBuilder.andWhere('role.name = :role', { role: filter.role });
    }

    if (filter.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
    }

    if (filter.department) {
      queryBuilder.andWhere('user.department = :department', { department: filter.department });
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const [users, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      users: users.map(user => this.formatUserResponse(user)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUserById(userId: string, tenantId: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('role.permissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('user.id = :userId', { userId })
      .andWhere('user.tenantId = :tenantId', { tenantId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserResponse(user);
  }

  async createUser(userData: any, tenantId: string, currentUserId: string) {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: userData.email, tenantId }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      tenantId,
      createdBy: currentUserId,
      isActive: true
    });

    const savedUser = await this.userRepository.save(user);

    // Assign roles if provided
    if (userData.roleIds && userData.roleIds.length > 0) {
      await this.assignRolesToUser(savedUser.id, userData.roleIds, tenantId, currentUserId);
    }

    return this.formatUserResponse(savedUser);
  }

  async updateUser(userId: string, userData: any, tenantId: string, currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email already exists (excluding current user)
    if (userData.email && userData.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email, tenantId }
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    // Update user
    Object.assign(user, {
      ...userData,
      updatedBy: currentUserId,
      updatedAt: new Date()
    });

    const savedUser = await this.userRepository.save(user);

    // Update roles if provided
    if (userData.roleIds !== undefined) {
      await this.updateUserRoles(userId, userData.roleIds, tenantId, currentUserId);
    }

    return this.formatUserResponse(savedUser);
  }

  async deleteUser(userId: string, tenantId: string, currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.userRepository.update(userId, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: currentUserId
    });

    return { message: 'User deleted successfully' };
  }

  async toggleUserStatus(userId: string, tenantId: string, currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = !user.isActive;
    user.updatedBy = currentUserId;
    user.updatedAt = new Date();

    const savedUser = await this.userRepository.save(user);

    return this.formatUserResponse(savedUser);
  }

  async resetUserPassword(userId: string, tenantId: string, currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    user.password = hashedPassword;
    user.updatedBy = currentUserId;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    return { 
      message: 'Password reset successfully',
      temporaryPassword: tempPassword // In production, send via email
    };
  }

  async updateUserPassword(userId: string, password: string, tenantId: string, currentUserId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.updatedBy = currentUserId;
    user.updatedAt = new Date();

    await this.userRepository.save(user);

    return { message: 'Password updated successfully' };
  }

  async getUserStats(tenantId: string) {
    const totalUsers = await this.userRepository.count({ where: { tenantId } });
    const activeUsers = await this.userRepository.count({ 
      where: { tenantId, isActive: true } 
    });
    const adminUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'userRole')
      .leftJoin('userRole.role', 'role')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('role.name = :role', { role: 'super_admin' })
      .getCount();

    return {
      total: totalUsers,
      active: activeUsers,
      admins: adminUsers,
      lastLogin: '2 saat önce' // This would be calculated from actual data
    };
  }

  // Role Management
  async getRoles(tenantId: string, filter: any) {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('role.tenantId = :tenantId', { tenantId });

    if (filter.search) {
      queryBuilder.andWhere(
        '(role.name ILIKE :search OR role.description ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    if (filter.isSystem !== undefined) {
      queryBuilder.andWhere('role.isSystem = :isSystem', { isSystem: filter.isSystem });
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const [roles, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      roles: roles.map(role => this.formatRoleResponse(role)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getRoleById(roleId: string, tenantId: string) {
    const role = await this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'rolePermission')
      .leftJoinAndSelect('rolePermission.permission', 'permission')
      .where('role.id = :roleId', { roleId })
      .andWhere('role.tenantId = :tenantId', { tenantId })
      .getOne();

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.formatRoleResponse(role);
  }

  async createRole(roleData: any, tenantId: string, currentUserId: string) {
    // Check if role name already exists
    const existingRole = await this.roleRepository.findOne({
      where: { name: roleData.name, tenantId }
    });

    if (existingRole) {
      throw new ConflictException('Role with this name already exists');
    }

    const role = this.roleRepository.create({
      ...roleData,
      tenantId,
      createdBy: currentUserId,
      isSystem: false
    });

    const savedRole = await this.roleRepository.save(role);

    // Assign permissions if provided
    if (roleData.permissionIds && roleData.permissionIds.length > 0) {
      await this.assignPermissionsToRole(savedRole.id, roleData.permissionIds, tenantId, currentUserId);
    }

    return this.formatRoleResponse(savedRole);
  }

  async updateRole(roleId: string, roleData: any, tenantId: string, currentUserId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenantId }
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Check if role name already exists (excluding current role)
    if (roleData.name && roleData.name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: roleData.name, tenantId }
      });

      if (existingRole) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    Object.assign(role, {
      ...roleData,
      updatedBy: currentUserId,
      updatedAt: new Date()
    });

    const savedRole = await this.roleRepository.save(role);

    // Update permissions if provided
    if (roleData.permissionIds !== undefined) {
      await this.updateRolePermissions(roleId, roleData.permissionIds, tenantId, currentUserId);
    }

    return this.formatRoleResponse(savedRole);
  }

  async deleteRole(roleId: string, tenantId: string, currentUserId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenantId }
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to any users
    const userCount = await this.userRoleRepository.count({
      where: { roleId }
    });

    if (userCount > 0) {
      throw new BadRequestException('Cannot delete role that is assigned to users');
    }

    await this.roleRepository.delete(roleId);

    return { message: 'Role deleted successfully' };
  }

  async getPermissions(tenantId: string) {
    const permissions = await this.permissionRepository.find({
      where: { tenantId }
    });

    return permissions.map(permission => ({
      id: permission.id,
      name: permission.name,
      description: permission.description,
      category: permission.category
    }));
  }

  // User-Role assignments
  async assignRole(userId: string, roleId: string, tenantId: string, currentUserId: string) {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if role exists
    const role = await this.roleRepository.findOne({
      where: { id: roleId, tenantId }
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Check if assignment already exists
    const existingAssignment = await this.userRoleRepository.findOne({
      where: { userId, roleId }
    });

    if (existingAssignment) {
      throw new ConflictException('User already has this role');
    }

    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      assignedBy: currentUserId,
      assignedAt: new Date()
    });

    await this.userRoleRepository.save(userRole);

    return { message: 'Role assigned successfully' };
  }

  async removeRole(userId: string, roleId: string, tenantId: string, currentUserId: string) {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId }
    });

    if (!userRole) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.userRoleRepository.delete({ userId, roleId });

    return { message: 'Role removed successfully' };
  }

  async getUserRoles(userId: string, tenantId: string) {
    const userRoles = await this.userRoleRepository
      .createQueryBuilder('userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .where('userRole.userId = :userId', { userId })
      .getMany();

    return userRoles.map(userRole => ({
      id: userRole.role.id,
      name: userRole.role.name,
      description: userRole.role.description,
      assignedAt: userRole.assignedAt
    }));
  }

  // Helper methods
  private formatUserResponse(user: User) {
    const permissions = new Set<string>();
    
    user.roles?.forEach(userRole => {
      userRole.role?.permissions?.forEach(rolePermission => {
        permissions.add(rolePermission.permission.name);
      });
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.roles?.[0]?.role?.name || 'user',
      permissions: Array.from(permissions),
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      phone: user.phone,
      department: user.department,
      avatar: user.avatar
    };
  }

  private formatRoleResponse(role: Role) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions?.map(rp => rp.permission.name) || [],
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    };
  }

  private async assignRolesToUser(userId: string, roleIds: string[], tenantId: string, currentUserId: string) {
    for (const roleId of roleIds) {
      await this.assignRole(userId, roleId, tenantId, currentUserId);
    }
  }

  private async updateUserRoles(userId: string, roleIds: string[], tenantId: string, currentUserId: string) {
    // Remove all existing roles
    await this.userRoleRepository.delete({ userId });

    // Assign new roles
    await this.assignRolesToUser(userId, roleIds, tenantId, currentUserId);
  }

  private async assignPermissionsToRole(roleId: string, permissionIds: string[], tenantId: string, currentUserId: string) {
    for (const permissionId of permissionIds) {
      const rolePermission = this.rolePermissionRepository.create({
        roleId,
        permissionId,
        assignedBy: currentUserId,
        assignedAt: new Date()
      });

      await this.rolePermissionRepository.save(rolePermission);
    }
  }

  private async updateRolePermissions(roleId: string, permissionIds: string[], tenantId: string, currentUserId: string) {
    // Remove all existing permissions
    await this.rolePermissionRepository.delete({ roleId });

    // Assign new permissions
    await this.assignPermissionsToRole(roleId, permissionIds, tenantId, currentUserId);
  }
}
