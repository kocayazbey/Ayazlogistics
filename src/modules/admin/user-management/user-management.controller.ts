import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UserManagementService } from './user-management.service';

@ApiTags('User Management')
@Controller({ path: 'admin/users', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'department', required: false })
  async getUsers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
    @Query('department') department?: string,
  ) {
    const filter = { page, limit, search, role, isActive, department };
    return await this.userManagementService.getUsers(tenantId, filter);
  }

  @Get(':id')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(
    @Param('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.userManagementService.getUserById(userId, tenantId);
  }

  @Post()
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Create new user' })
  async createUser(
    @Body() userData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.createUser(userData, tenantId, currentUserId);
  }

  @Put(':id')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Update user' })
  async updateUser(
    @Param('id') userId: string,
    @Body() userData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.updateUser(userId, userData, tenantId, currentUserId);
  }

  @Delete(':id')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.deleteUser(userId, tenantId, currentUserId);
  }

  @Patch(':id/toggle-status')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Toggle user active status' })
  async toggleUserStatus(
    @Param('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.toggleUserStatus(userId, tenantId, currentUserId);
  }

  @Post(':id/reset-password')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Reset user password' })
  async resetUserPassword(
    @Param('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.resetUserPassword(userId, tenantId, currentUserId);
  }

  @Patch(':id/password')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Update user password' })
  async updateUserPassword(
    @Param('id') userId: string,
    @Body() data: { password: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.updateUserPassword(userId, data.password, tenantId, currentUserId);
  }

  @Get('stats/overview')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats(@CurrentUser('tenantId') tenantId: string) {
    return await this.userManagementService.getUserStats(tenantId);
  }

  // Role Management
  @Get('roles')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get all roles' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isSystem', required: false })
  async getRoles(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('isSystem') isSystem?: boolean,
  ) {
    const filter = { page, limit, search, isSystem };
    return await this.userManagementService.getRoles(tenantId, filter);
  }

  @Get('roles/:id')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get role by ID' })
  async getRoleById(
    @Param('id') roleId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.userManagementService.getRoleById(roleId, tenantId);
  }

  @Post('roles')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Create new role' })
  async createRole(
    @Body() roleData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.createRole(roleData, tenantId, currentUserId);
  }

  @Put('roles/:id')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Update role' })
  async updateRole(
    @Param('id') roleId: string,
    @Body() roleData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.updateRole(roleId, roleData, tenantId, currentUserId);
  }

  @Delete('roles/:id')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Delete role' })
  async deleteRole(
    @Param('id') roleId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.deleteRole(roleId, tenantId, currentUserId);
  }

  @Get('permissions')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get all permissions' })
  async getPermissions(@CurrentUser('tenantId') tenantId: string) {
    return await this.userManagementService.getPermissions(tenantId);
  }

  // User-Role assignments
  @Post(':userId/roles')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @Param('userId') userId: string,
    @Body() data: { roleId: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.assignRole(userId, data.roleId, tenantId, currentUserId);
  }

  @Delete(':userId/roles/:roleId')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return await this.userManagementService.removeRole(userId, roleId, tenantId, currentUserId);
  }

  @Get(':userId/roles')
  @Roles('super_admin', 'it_admin')
  @ApiOperation({ summary: 'Get user roles' })
  async getUserRoles(
    @Param('userId') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.userManagementService.getUserRoles(userId, tenantId);
  }
}
