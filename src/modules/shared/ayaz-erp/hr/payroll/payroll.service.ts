import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { employees, payrolls, attendance } from '../../../../../database/schema/shared/erp-hr.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class PayrollService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async generatePayroll(employeeId: string, periodStart: Date, periodEnd: Date, tenantId: string, userId: string) {
    const [employee] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .limit(1);

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const attendanceRecords = await this.db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.tenantId, tenantId),
          eq(attendance.employeeId, employeeId),
          gte(attendance.attendanceDate, periodStart),
          lte(attendance.attendanceDate, periodEnd),
        ),
      );

    const baseSalary = parseFloat(employee.baseSalary || '0');
    
    const totalOvertime = attendanceRecords.reduce((sum, record) => {
      return sum + parseFloat(record.overtimeHours || '0');
    }, 0);

    const hourlyRate = baseSalary / 160;
    const overtimePay = totalOvertime * hourlyRate * 1.5;

    const grossPay = baseSalary + overtimePay;

    const incomeTax = grossPay * 0.15;
    const socialSecurity = grossPay * 0.14;
    const totalDeductions = incomeTax + socialSecurity;
    const netPay = grossPay - totalDeductions;

    const payDate = new Date(periodEnd);
    payDate.setDate(payDate.getDate() + 5);

    const payrollNumber = `PAY-${Date.now()}`;

    const [payroll] = await this.db
      .insert(payrolls)
      .values({
        tenantId,
        employeeId,
        payrollNumber,
        payPeriodStart: periodStart,
        payPeriodEnd: periodEnd,
        payDate,
        baseSalary: baseSalary.toString(),
        overtime: overtimePay.toString(),
        grossPay: grossPay.toString(),
        incomeTax: incomeTax.toString(),
        socialSecurity: socialSecurity.toString(),
        totalDeductions: totalDeductions.toString(),
        netPay: netPay.toString(),
        status: 'pending',
        createdBy: userId,
      })
      .returning();

    await this.eventBus.emit('payroll.generated', { payrollId: payroll.id, employeeId, tenantId });

    return payroll;
  }

  async getPayrolls(tenantId: string, filters?: {
    employeeId?: string;
    status?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }) {
    let query = this.db.select().from(payrolls).where(eq(payrolls.tenantId, tenantId));

    if (filters?.employeeId) {
      query = query.where(and(eq(payrolls.tenantId, tenantId), eq(payrolls.employeeId, filters.employeeId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(payrolls.tenantId, tenantId), eq(payrolls.status, filters.status)));
    }

    if (filters?.periodStart && filters?.periodEnd) {
      query = query.where(
        and(
          eq(payrolls.tenantId, tenantId),
          gte(payrolls.payPeriodStart, filters.periodStart),
          lte(payrolls.payPeriodEnd, filters.periodEnd),
        ),
      );
    }

    return await query;
  }

  async approvePayroll(payrollId: string, tenantId: string) {
    const [updated] = await this.db
      .update(payrolls)
      .set({
        status: 'approved',
        updatedAt: new Date(),
      })
      .where(and(eq(payrolls.id, payrollId), eq(payrolls.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('payroll.approved', { payrollId, tenantId });

    return updated;
  }

  async processPayment(payrollId: string, tenantId: string) {
    const [updated] = await this.db
      .update(payrolls)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(payrolls.id, payrollId), eq(payrolls.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('payroll.paid', { payrollId, tenantId });

    return updated;
  }

  async getPayrollSummary(tenantId: string, periodStart: Date, periodEnd: Date) {
    const payrollRecords = await this.db
      .select()
      .from(payrolls)
      .where(
        and(
          eq(payrolls.tenantId, tenantId),
          gte(payrolls.payPeriodStart, periodStart),
          lte(payrolls.payPeriodEnd, periodEnd),
        ),
      );

    const totalGross = payrollRecords.reduce((sum, p) => sum + parseFloat(p.grossPay || '0'), 0);
    const totalNet = payrollRecords.reduce((sum, p) => sum + parseFloat(p.netPay || '0'), 0);
    const totalDeductions = payrollRecords.reduce((sum, p) => sum + parseFloat(p.totalDeductions || '0'), 0);

    return {
      period: { periodStart, periodEnd },
      employeeCount: payrollRecords.length,
      totalGross,
      totalNet,
      totalDeductions,
      averageGross: payrollRecords.length > 0 ? totalGross / payrollRecords.length : 0,
      averageNet: payrollRecords.length > 0 ? totalNet / payrollRecords.length : 0,
    };
  }
}
