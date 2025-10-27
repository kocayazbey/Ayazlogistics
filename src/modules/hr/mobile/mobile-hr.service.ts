import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/drizzle-orm.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { employees, attendance, leaveRequests, payroll } from '../../../core/database/schema';
import { eq, and, desc, gte, lte, like } from 'drizzle-orm';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  status: 'active' | 'inactive' | 'terminated';
  hireDate: Date;
  salary?: number;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  employeeId: string;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'late' | 'half_day';
  notes?: string;
  createdAt: Date;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'sick' | 'vacation' | 'personal' | 'maternity' | 'paternity';
  startDate: Date;
  endDate: Date;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MobileHrService {
  private readonly logger = new Logger(MobileHrService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async getEmployees(
    tenantId: string,
    filters?: {
      department?: string;
      status?: string;
      search?: string;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(employees)
        .where(eq(employees.tenantId, tenantId))
        .orderBy(desc(employees.createdAt));

      if (filters?.department) {
        query = query.where(eq(employees.department, filters.department));
      }

      if (filters?.status) {
        query = query.where(eq(employees.status, filters.status));
      }

      if (filters?.search) {
        query = query.where(like(employees.name, `%${filters.search}%`));
      }

      const employeesData = await query;

      return {
        success: true,
        data: employeesData,
        count: employeesData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get employees: ${error.message}`);
      throw new Error('Failed to retrieve employees');
    }
  }

  async getEmployeeById(employeeId: string, tenantId: string) {
    try {
      const employee = await this.db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.id, employeeId),
            eq(employees.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!employee.length) {
        throw new NotFoundException('Employee not found');
      }

      return {
        success: true,
        data: employee[0],
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get employee: ${error.message}`);
      throw new Error('Failed to retrieve employee');
    }
  }

  async getAttendance(
    employeeId: string,
    tenantId: string,
    filters?: {
      dateFrom?: Date;
      dateTo?: Date;
      status?: string;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.employeeId, employeeId),
            eq(attendance.tenantId, tenantId),
          ),
        )
        .orderBy(desc(attendance.date));

      if (filters?.dateFrom) {
        query = query.where(gte(attendance.date, filters.dateFrom));
      }

      if (filters?.dateTo) {
        query = query.where(lte(attendance.date, filters.dateTo));
      }

      if (filters?.status) {
        query = query.where(eq(attendance.status, filters.status));
      }

      const attendanceData = await query;

      return {
        success: true,
        data: attendanceData,
        count: attendanceData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get attendance: ${error.message}`);
      throw new Error('Failed to retrieve attendance');
    }
  }

  async clockIn(employeeId: string, tenantId: string, notes?: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if already clocked in today
      const existingAttendance = await this.db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.employeeId, employeeId),
            eq(attendance.tenantId, tenantId),
            gte(attendance.date, today),
          ),
        )
        .limit(1);

      if (existingAttendance.length > 0 && existingAttendance[0].checkIn) {
        throw new Error('Already clocked in today');
      }

      const attendanceId = `att_${Date.now()}`;
      const now = new Date();

      const newAttendance = {
        id: attendanceId,
        employeeId,
        tenantId,
        date: today,
        checkIn: now,
        status: 'present' as const,
        notes,
        createdAt: now,
      };

      await this.db.insert(attendance).values(newAttendance);

      this.logger.log(`Employee ${employeeId} clocked in at ${now}`);

      return {
        success: true,
        message: 'Clocked in successfully',
        data: newAttendance,
      };
    } catch (error) {
      this.logger.error(`Failed to clock in: ${error.message}`);
      throw new Error('Failed to clock in');
    }
  }

  async clockOut(employeeId: string, tenantId: string, notes?: string) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find today's attendance record
      const existingAttendance = await this.db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.employeeId, employeeId),
            eq(attendance.tenantId, tenantId),
            gte(attendance.date, today),
          ),
        )
        .limit(1);

      if (!existingAttendance.length || !existingAttendance[0].checkIn) {
        throw new Error('Not clocked in today');
      }

      if (existingAttendance[0].checkOut) {
        throw new Error('Already clocked out today');
      }

      const now = new Date();
      const checkInTime = existingAttendance[0].checkIn;
      const workHours = (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      await this.db
        .update(attendance)
        .set({
          checkOut: now,
          notes: notes || existingAttendance[0].notes,
          status: workHours >= 8 ? 'present' : 'half_day',
        })
        .where(eq(attendance.id, existingAttendance[0].id));

      this.logger.log(`Employee ${employeeId} clocked out at ${now}`);

      return {
        success: true,
        message: 'Clocked out successfully',
        data: {
          checkIn: checkInTime,
          checkOut: now,
          workHours: Math.round(workHours * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to clock out: ${error.message}`);
      throw new Error('Failed to clock out');
    }
  }

  async getLeaveRequests(
    employeeId: string,
    tenantId: string,
    filters?: {
      status?: string;
      type?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.employeeId, employeeId),
            eq(leaveRequests.tenantId, tenantId),
          ),
        )
        .orderBy(desc(leaveRequests.createdAt));

      if (filters?.status) {
        query = query.where(eq(leaveRequests.status, filters.status));
      }

      if (filters?.type) {
        query = query.where(eq(leaveRequests.type, filters.type));
      }

      if (filters?.dateFrom) {
        query = query.where(gte(leaveRequests.startDate, filters.dateFrom));
      }

      if (filters?.dateTo) {
        query = query.where(lte(leaveRequests.endDate, filters.dateTo));
      }

      const leaveRequestsData = await query;

      return {
        success: true,
        data: leaveRequestsData,
        count: leaveRequestsData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get leave requests: ${error.message}`);
      throw new Error('Failed to retrieve leave requests');
    }
  }

  async createLeaveRequest(
    employeeId: string,
    tenantId: string,
    data: {
      type: string;
      startDate: Date;
      endDate: Date;
      reason: string;
    },
  ) {
    try {
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const leaveRequestId = `lr_${Date.now()}`;
      const now = new Date();

      const newLeaveRequest = {
        id: leaveRequestId,
        employeeId,
        tenantId,
        type: data.type,
        startDate,
        endDate,
        days,
        status: 'pending' as const,
        reason: data.reason,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(leaveRequests).values(newLeaveRequest);

      this.logger.log(`Leave request created: ${leaveRequestId}`);

      return {
        success: true,
        message: 'Leave request created successfully',
        data: newLeaveRequest,
      };
    } catch (error) {
      this.logger.error(`Failed to create leave request: ${error.message}`);
      throw new Error('Failed to create leave request');
    }
  }

  async getPayroll(
    employeeId: string,
    tenantId: string,
    filters?: {
      year?: number;
      month?: number;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(payroll)
        .where(
          and(
            eq(payroll.employeeId, employeeId),
            eq(payroll.tenantId, tenantId),
          ),
        )
        .orderBy(desc(payroll.payPeriod));

      if (filters?.year) {
        query = query.where(eq(payroll.year, filters.year));
      }

      if (filters?.month) {
        query = query.where(eq(payroll.month, filters.month));
      }

      const payrollData = await query;

      return {
        success: true,
        data: payrollData,
        count: payrollData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get payroll: ${error.message}`);
      throw new Error('Failed to retrieve payroll');
    }
  }

  async getHrMetrics(tenantId: string) {
    try {
      // Get total employees
      const totalEmployees = await this.db
        .select({ count: employees.id })
        .from(employees)
        .where(eq(employees.tenantId, tenantId));

      // Get active employees
      const activeEmployees = await this.db
        .select({ count: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.status, 'active'),
          ),
        );

      // Get pending leave requests
      const pendingLeaveRequests = await this.db
        .select({ count: leaveRequests.id })
        .from(leaveRequests)
        .where(
          and(
            eq(leaveRequests.tenantId, tenantId),
            eq(leaveRequests.status, 'pending'),
          ),
        );

      // Get today's attendance
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAttendance = await this.db
        .select({ count: attendance.id })
        .from(attendance)
        .where(
          and(
            eq(attendance.tenantId, tenantId),
            gte(attendance.date, today),
            eq(attendance.status, 'present'),
          ),
        );

      return {
        success: true,
        data: {
          totalEmployees: totalEmployees.length,
          activeEmployees: activeEmployees.length,
          pendingLeaveRequests: pendingLeaveRequests.length,
          presentToday: todayAttendance.length,
          attendanceRate: activeEmployees.length > 0 
            ? Math.round((todayAttendance.length / activeEmployees.length) * 100) 
            : 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get HR metrics: ${error.message}`);
      throw new Error('Failed to retrieve HR metrics');
    }
  }
}
