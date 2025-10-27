import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { users } from '../../database/schema/auth.schema';

type UserRole = 'forklift_operator' | 'warehouse_worker' | 'accountant' | 'hr_manager' | 'sales_rep' | 'driver' | 'admin';

interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  permissions: string[];
  warehouseId?: string;
  isActive: boolean;
}

@Injectable()
export class MobileAuthService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly jwtService: JwtService,
  ) {}

  async validateUserAndLogin(email: string, password: string) {
    const user = await this.findUserByEmail(email);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: '24h' }
    );

    const refreshToken = this.jwtService.sign(
      { id: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        warehouseId: user.warehouseId,
      },
      token: accessToken,
      refreshToken,
    };
  }

  async registerUser(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const newUser = {
      id: `user-${Date.now()}`,
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: data.role || 'warehouse_worker',
      permissions: this.getDefaultPermissions(data.role),
      warehouseId: data.warehouseId,
      isActive: true,
      createdAt: new Date(),
    };

    return newUser;
  }

  async getUserProfile(userId: string) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      warehouseId: user.warehouseId,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.findUserById(payload.id);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      const accessToken = this.jwtService.sign(
        { id: user.id, email: user.email, role: user.role },
        { expiresIn: '24h' }
      );

      return { token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    return { message: 'Logout successful' };
  }

  async registerBiometric(userId: string, deviceId: string, biometricData: string) {
    return { message: 'Biometric registered successfully' };
  }

  async biometricLogin(deviceId: string, biometricToken: string) {
    return { token: 'biometric_access_token', user: {} };
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const demoUsers: User[] = [
      {
        id: 'user-1',
        email: 'forklift@ayaz.com',
        password: await bcrypt.hash('123456', 10),
        name: 'Forklift Operator',
        role: 'forklift_operator',
        permissions: ['pallet.scan', 'pallet.assign', 'order.view', 'order.process'],
        isActive: true,
      },
      {
        id: 'user-2',
        email: 'warehouse@ayaz.com',
        password: await bcrypt.hash('123456', 10),
        name: 'Warehouse Worker',
        role: 'warehouse_worker',
        permissions: ['goods.receive', 'shipment.process', 'inventory.view'],
        isActive: true,
      },
      {
        id: 'user-3',
        email: 'accountant@ayaz.com',
        password: await bcrypt.hash('123456', 10),
        name: 'Accountant',
        role: 'accountant',
        permissions: ['invoice.view', 'invoice.create', 'payment.process', 'report.view'],
        isActive: true,
      },
      {
        id: 'user-4',
        email: 'hr@ayaz.com',
        password: await bcrypt.hash('123456', 10),
        name: 'HR Manager',
        role: 'hr_manager',
        permissions: ['employee.view', 'employee.manage', 'leave.approve', 'leave.reject'],
        isActive: true,
      },
      {
        id: 'user-5',
        email: 'sales@ayaz.com',
        password: await bcrypt.hash('123456', 10),
        name: 'Sales Representative',
        role: 'sales_rep',
        permissions: ['customer.view', 'opportunity.manage', 'quote.create'],
        isActive: true,
      },
    ];

    return demoUsers.find(u => u.email === email) || null;
  }

  private async findUserById(id: string): Promise<User | null> {
    return null;
  }

  private getDefaultPermissions(role: UserRole): string[] {
    const permissionMap = {
      forklift_operator: ['pallet.scan', 'pallet.assign', 'order.view', 'order.process'],
      warehouse_worker: ['goods.receive', 'shipment.process', 'inventory.view'],
      accountant: ['invoice.view', 'invoice.create', 'payment.process', 'report.view'],
      hr_manager: ['employee.view', 'employee.manage', 'leave.approve', 'leave.reject'],
      sales_rep: ['customer.view', 'opportunity.manage', 'quote.create'],
      driver: ['route.view', 'delivery.process', 'pod.upload'],
      admin: ['*'],
    };

    return permissionMap[role] || [];
  }
}

