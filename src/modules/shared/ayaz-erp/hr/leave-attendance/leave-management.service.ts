import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, sql, gte, lte } from 'drizzle-orm';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { pgTable, uuid, varchar, date, integer, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../../database/schema/core/tenants.schema';
import { users } from '../../../../../database/schema/core/users.schema';

export const leaveRequests = pgTable('erp_leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  requestNumber: varchar('request_number', { length: 50 }).notNull().unique(),
  leaveType: varchar('leave_type', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalDays: integer('total_days').notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).default('pending'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by').references(() => users.id),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const attendanceRecords = pgTable('erp_attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  recordDate: date('record_date').notNull(),
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  totalHours: integer('total_hours'),
  status: varchar('status', { length: 20 }).default('present'),
  location: varchar('location', { length: 255 }),
  notes: text('notes'),
  isLate: boolean('is_late').default(false),
  isEarlyLeave: boolean('is_early_leave').default(false),
  overtimeHours: integer('overtime_hours').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const leaveBalances = pgTable('erp_leave_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  year: integer('year').notNull(),
  leaveType: varchar('leave_type', { length: 50 }).notNull(),
  entitled: integer('entitled').notNull(),
  used: integer('used').default(0),
  pending: integer('pending').default(0),
  remaining: integer('remaining').notNull(),
  carriedOver: integer('carried_over').default(0),
  metadata: jsonb('metadata'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

@Injectable()
export class LeaveManagementService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createLeaveRequest(data: {
    tenantId: string;
    employeeId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
  }): Promise<any> {
    const totalDays = this.calculateWorkingDays(data.startDate, data.endDate);
    
    const balance = await this.getLeaveBalance(
      data.tenantId,
      data.employeeId,
      data.leaveType,
      new Date().getFullYear(),
    );

    if (balance.remaining < totalDays) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${balance.remaining} days, Requested: ${totalDays} days`,
      );
    }

    const requestNumber = `LEAVE-${Date.now()}`;

    const [request] = await this.db.insert(leaveRequests).values({
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      requestNumber,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays,
      reason: data.reason,
      status: 'pending',
    }).returning();

    await this.db
      .update(leaveBalances)
      .set({
        pending: sql`${leaveBalances.pending} + ${totalDays}`,
        remaining: sql`${leaveBalances.remaining} - ${totalDays}`,
      })
      .where(
        and(
          eq(leaveBalances.employeeId, data.employeeId),
          eq(leaveBalances.leaveType, data.leaveType),
          eq(leaveBalances.year, new Date().getFullYear()),
        ),
      );

    await this.eventBus.emit('leave.request.created', {
      requestId: request.id,
      employeeId: data.employeeId,
      totalDays,
    });

    return request;
  }

  async approveLeaveRequest(requestId: string, approverId: string): Promise<any> {
    const [request] = await this.db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot approve request with status: ${request.status}`);
    }

    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(leaveRequests.id, requestId))
      .returning();

    await this.db
      .update(leaveBalances)
      .set({
        pending: sql`${leaveBalances.pending} - ${request.totalDays}`,
        used: sql`${leaveBalances.used} + ${request.totalDays}`,
      })
      .where(
        and(
          eq(leaveBalances.employeeId, request.employeeId),
          eq(leaveBalances.leaveType, request.leaveType),
        ),
      );

    await this.eventBus.emit('leave.request.approved', {
      requestId,
      employeeId: request.employeeId,
      approverId,
    });

    return updated;
  }

  async rejectLeaveRequest(requestId: string, rejectedBy: string, reason: string): Promise<any> {
    const [request] = await this.db
      .select()
      .from(leaveRequests)
      .where(eq(leaveRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new NotFoundException('Leave request not found');
    }

    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(leaveRequests.id, requestId))
      .returning();

    await this.db
      .update(leaveBalances)
      .set({
        pending: sql`${leaveBalances.pending} - ${request.totalDays}`,
        remaining: sql`${leaveBalances.remaining} + ${request.totalDays}`,
      })
      .where(
        and(
          eq(leaveBalances.employeeId, request.employeeId),
          eq(leaveBalances.leaveType, request.leaveType),
        ),
      );

    await this.eventBus.emit('leave.request.rejected', {
      requestId,
      employeeId: request.employeeId,
      rejectedBy,
    });

    return updated;
  }

  async getLeaveBalance(
    tenantId: string,
    employeeId: string,
    leaveType: string,
    year: number,
  ): Promise<any> {
    const [balance] = await this.db
      .select()
      .from(leaveBalances)
      .where(
        and(
          eq(leaveBalances.tenantId, tenantId),
          eq(leaveBalances.employeeId, employeeId),
          eq(leaveBalances.leaveType, leaveType),
          eq(leaveBalances.year, year),
        ),
      )
      .limit(1);

    if (!balance) {
      const entitled = this.getDefaultEntitlement(leaveType);
      const [created] = await this.db
        .insert(leaveBalances)
        .values({
          tenantId,
          employeeId,
          year,
          leaveType,
          entitled,
          used: 0,
          pending: 0,
          remaining: entitled,
          carriedOver: 0,
        })
        .returning();
      return created;
    }

    return balance;
  }

  async recordAttendance(data: {
    tenantId: string;
    employeeId: string;
    recordDate: Date;
    checkInTime: Date;
    checkOutTime?: Date;
    location?: string;
    notes?: string;
  }): Promise<any> {
    const totalHours = data.checkOutTime
      ? Math.round((data.checkOutTime.getTime() - data.checkInTime.getTime()) / (1000 * 60 * 60))
      : null;

    const standardCheckIn = new Date(data.checkInTime);
    standardCheckIn.setHours(9, 0, 0, 0);
    const isLate = data.checkInTime > standardCheckIn;

    const standardCheckOut = new Date(data.checkInTime);
    standardCheckOut.setHours(18, 0, 0, 0);
    const isEarlyLeave = data.checkOutTime && data.checkOutTime < standardCheckOut;

    const overtimeHours = totalHours && totalHours > 9 ? totalHours - 9 : 0;

    const [record] = await this.db.insert(attendanceRecords).values({
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      recordDate: data.recordDate,
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
      totalHours,
      status: 'present',
      location: data.location,
      notes: data.notes,
      isLate,
      isEarlyLeave,
      overtimeHours,
    }).returning();

    await this.eventBus.emit('attendance.recorded', {
      recordId: record.id,
      employeeId: data.employeeId,
      totalHours,
      overtimeHours,
    });

    return record;
  }

  async getAttendanceSummary(
    tenantId: string,
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const records = await this.db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.recordDate, startDate),
          lte(attendanceRecords.recordDate, endDate),
        ),
      );

    const totalDays = records.length;
    const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const totalOvertime = records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const lateDays = records.filter((r) => r.isLate).length;
    const earlyLeaveDays = records.filter((r) => r.isEarlyLeave).length;

    return {
      employeeId,
      period: { startDate, endDate },
      totalDays,
      totalHours,
      totalOvertime,
      lateDays,
      earlyLeaveDays,
      averageHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
      attendanceRate: ((totalDays / this.getWorkingDays(startDate, endDate)) * 100).toFixed(2),
    };
  }

  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private getWorkingDays(startDate: Date, endDate: Date): number {
    return this.calculateWorkingDays(startDate, endDate);
  }

  private getDefaultEntitlement(leaveType: string): number {
    const entitlements: Record<string, number> = {
      annual: 14,
      sick: 10,
      maternity: 112,
      paternity: 5,
      unpaid: 0,
      marriage: 3,
      bereavement: 3,
    };

    return entitlements[leaveType] || 0;
  }
}

