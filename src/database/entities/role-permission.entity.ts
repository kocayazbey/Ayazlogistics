import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roleId: string;

  @Column()
  permissionId: string;

  @Column({ nullable: true })
  assignedBy: string;

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => Role, role => role.permissions)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @ManyToOne(() => Permission, permission => permission.roles)
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;
}
