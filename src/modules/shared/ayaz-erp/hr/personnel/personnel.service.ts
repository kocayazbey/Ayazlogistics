import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like, or, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { employees, attendance, leaveRequests, performanceReviews } from '../../../../../database/schema/shared/erp-hr.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { CacheService } from '../../../../../common/services/cache.service';

@Injectable()
export class PersonnelService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createEmployee(data: any, tenantId: string) {
    const employeeNumber = `EMP-${Date.now()}`;

    const existing = await this.db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          or(
            eq(employees.email, data.email),
            eq(employees.nationalId, data.nationalId),
          ),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException('Employee with this email or national ID already exists');
    }

    const [employee] = await this.db
      .insert(employees)
      .values({
        tenantId,
        employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        nationalId: data.nationalId,
        dateOfBirth: data.dateOfBirth,
        hireDate: data.hireDate,
        department: data.department,
        position: data.position,
        employmentType: data.employmentType,
        baseSalary: data.baseSalary,
        bankAccount: data.bankAccount,
        taxNumber: data.taxNumber,
        socialSecurityNumber: data.socialSecurityNumber,
        address: data.address,
        emergencyContact: data.emergencyContact,
        status: 'active',
      })
      .returning();

    await this.eventBus.emit('employee.created', { employeeId: employee.id, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('employees', tenantId));

    return employee;
  }

  async getEmployees(tenantId: string, filters?: {
    department?: string;
    position?: string;
    status?: string;
    employmentType?: string;
    search?: string;
  }) {
    const cacheKey = this.cacheService.generateKey('employees', tenantId, JSON.stringify(filters || {}));

    return this.cacheService.wrap(cacheKey, async () => {
      let query = this.db.select().from(employees).where(eq(employees.tenantId, tenantId));

      if (filters?.department) {
        query = query.where(and(eq(employees.tenantId, tenantId), eq(employees.department, filters.department)));
      }

      if (filters?.position) {
        query = query.where(and(eq(employees.tenantId, tenantId), eq(employees.position, filters.position)));
      }

      if (filters?.status) {
        query = query.where(and(eq(employees.tenantId, tenantId), eq(employees.status, filters.status)));
      }

      if (filters?.employmentType) {
        query = query.where(and(eq(employees.tenantId, tenantId), eq(employees.employmentType, filters.employmentType)));
      }

      if (filters?.search) {
        query = query.where(
          and(
            eq(employees.tenantId, tenantId),
            or(
              like(employees.firstName, `%${filters.search}%`),
              like(employees.lastName, `%${filters.search}%`),
              like(employees.email, `%${filters.search}%`),
              like(employees.employeeNumber, `%${filters.search}%`),
            ),
          ),
        );
      }

      return await query;
    }, 300);
  }

  async getEmployeeById(employeeId: string, tenantId: string) {
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async updateEmployee(employeeId: string, data: any, tenantId: string) {
    const [updated] = await this.db
      .update(employees)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Employee not found');
    }

    await this.eventBus.emit('employee.updated', { employeeId, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('employees', tenantId));

    return updated;
  }

  async terminateEmployee(employeeId: string, terminationDate: Date, tenantId: string) {
    const [updated] = await this.db
      .update(employees)
      .set({
        terminationDate,
        status: 'terminated',
        updatedAt: new Date(),
      })
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('employee.terminated', { employeeId, terminationDate, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('employees', tenantId));

    return updated;
  }

  async recordAttendance(data: {
    employeeId: string;
    attendanceDate: Date;
    checkIn: Date;
    checkOut?: Date;
    notes?: string;
  }, tenantId: string) {
    let totalHours = 0;
    let overtimeHours = 0;
    let status = 'present';

    if (data.checkOut) {
      const diff = data.checkOut.getTime() - data.checkIn.getTime();
      totalHours = diff / (1000 * 60 * 60);

      const regularHours = 8;
      if (totalHours > regularHours) {
        overtimeHours = totalHours - regularHours;
      }

      const checkInHour = data.checkIn.getHours();
      if (checkInHour > 9) {
        status = 'late';
      }
    }

    const [attendance] = await this.db
      .insert(attendance)
      .values({
        tenantId,
        employeeId: data.employeeId,
        attendanceDate: data.attendanceDate,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalHours: totalHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        status,
        notes: data.notes,
      })
      .returning();

    await this.eventBus.emit('attendance.recorded', { employeeId: data.employeeId, tenantId });

    return attendance;
  }

  async getAttendance(employeeId: string, startDate: Date, endDate: Date, tenantId: string) {
    return await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          eq(attendance.employeeId, employeeId),
          gte(attendance.attendanceDate, startDate),
          lte(attendance.attendanceDate, endDate),
        ),
      );
  }

  async createLeaveRequest(data: {
    employeeId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
  }, tenantId: string) {
    const daysDiff = Math.ceil((data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalDays = daysDiff + 1;

    const [leaveRequest] = await this.db
      .insert(leaveRequests)
      .values({
        tenantId,
        employeeId: data.employeeId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays,
        reason: data.reason,
        status: 'pending',
      })
      .returning();

    await this.eventBus.emit('leave.requested', { leaveRequestId: leaveRequest.id, employeeId: data.employeeId, tenantId });

    return leaveRequest;
  }

  async approveLeaveRequest(leaveRequestId: string, approverId: string, tenantId: string) {
    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('leave.approved', { leaveRequestId, approverId, tenantId });

    return updated;
  }

  async rejectLeaveRequest(leaveRequestId: string, reason: string, tenantId: string) {
    const [updated] = await this.db
      .update(leaveRequests)
      .set({
        status: 'rejected',
        rejectedReason: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(leaveRequests.id, leaveRequestId), eq(leaveRequests.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('leave.rejected', { leaveRequestId, reason, tenantId });

    return updated;
  }

  async createPerformanceReview(data: {
    employeeId: string;
    reviewPeriodStart: Date;
    reviewPeriodEnd: Date;
    reviewDate: Date;
    reviewedBy: string;
    overallRating: number;
    kpiScores?: any;
    strengths?: string;
    areasForImprovement?: string;
    goals?: any;
    feedback?: string;
  }, tenantId: string) {
    const [review] = await this.db
      .insert(performanceReviews)
      .values({
        tenantId,
        employeeId: data.employeeId,
        reviewPeriodStart: data.reviewPeriodStart,
        reviewPeriodEnd: data.reviewPeriodEnd,
        reviewDate: data.reviewDate,
        reviewedBy: data.reviewedBy,
        overallRating: data.overallRating,
        kpiScores: data.kpiScores,
        strengths: data.strengths,
        areasForImprovement: data.areasForImprovement,
        goals: data.goals,
        feedback: data.feedback,
        status: 'draft',
      })
      .returning();

    await this.eventBus.emit('performance.review.created', { reviewId: review.id, employeeId: data.employeeId, tenantId });

    return review;
  }

  async getActiveEmployeesCount(tenantId: string): Promise<number> {
    const activeEmployees = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.status, 'active')));

    return activeEmployees.length;
  }

  async getEmployeesByDepartment(tenantId: string) {
    const allEmployees = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.tenantId, tenantId), eq(employees.status, 'active')));

    const byDepartment: Record<string, number> = {};

    for (const emp of allEmployees) {
      const dept = emp.department || 'Unassigned';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    }

    return byDepartment;
  }
}
