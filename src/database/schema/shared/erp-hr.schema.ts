import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const employees = pgTable('erp_employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  employeeNumber: varchar('employee_number', { length: 50 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  nationalId: varchar('national_id', { length: 50 }),
  dateOfBirth: date('date_of_birth'),
  hireDate: date('hire_date').notNull(),
  terminationDate: date('termination_date'),
  department: varchar('department', { length: 100 }),
  position: varchar('position', { length: 100 }),
  managerId: uuid('manager_id'),
  employmentType: varchar('employment_type', { length: 50 }), // 'full_time', 'part_time', 'contract'
  baseSalary: decimal('base_salary', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  bankAccount: varchar('bank_account', { length: 50 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  socialSecurityNumber: varchar('social_security_number', { length: 50 }),
  address: text('address'),
  emergencyContact: jsonb('emergency_contact'),
  documents: jsonb('documents'),
  status: varchar('status', { length: 20 }).default('active'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const payrolls = pgTable('erp_payrolls', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  payrollNumber: varchar('payroll_number', { length: 50 }).notNull().unique(),
  payPeriodStart: date('pay_period_start').notNull(),
  payPeriodEnd: date('pay_period_end').notNull(),
  payDate: date('pay_date').notNull(),
  baseSalary: decimal('base_salary', { precision: 12, scale: 2 }).notNull(),
  overtime: decimal('overtime', { precision: 12, scale: 2 }).default('0'),
  bonus: decimal('bonus', { precision: 12, scale: 2 }).default('0'),
  allowances: decimal('allowances', { precision: 12, scale: 2 }).default('0'),
  grossPay: decimal('gross_pay', { precision: 12, scale: 2 }).notNull(),
  incomeTax: decimal('income_tax', { precision: 12, scale: 2 }).default('0'),
  socialSecurity: decimal('social_security', { precision: 12, scale: 2 }).default('0'),
  otherDeductions: decimal('other_deductions', { precision: 12, scale: 2 }).default('0'),
  totalDeductions: decimal('total_deductions', { precision: 12, scale: 2 }).notNull(),
  netPay: decimal('net_pay', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  status: varchar('status', { length: 20 }).default('pending'),
  paidAt: timestamp('paid_at'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const leaveRequests = pgTable('erp_leave_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  leaveType: varchar('leave_type', { length: 50 }).notNull(), // 'annual', 'sick', 'unpaid', 'maternity', etc.
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  totalDays: integer('total_days').notNull(),
  reason: text('reason'),
  status: varchar('status', { length: 20 }).default('pending'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectedReason: text('rejected_reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const attendance = pgTable('erp_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  attendanceDate: date('attendance_date').notNull(),
  checkIn: timestamp('check_in'),
  checkOut: timestamp('check_out'),
  totalHours: decimal('total_hours', { precision: 5, scale: 2 }),
  overtimeHours: decimal('overtime_hours', { precision: 5, scale: 2 }).default('0'),
  status: varchar('status', { length: 20 }).default('present'), // 'present', 'absent', 'late', 'half_day'
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const performanceReviews = pgTable('erp_performance_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => employees.id, { onDelete: 'cascade' }),
  reviewPeriodStart: date('review_period_start').notNull(),
  reviewPeriodEnd: date('review_period_end').notNull(),
  reviewDate: date('review_date').notNull(),
  reviewedBy: uuid('reviewed_by'),
  overallRating: integer('overall_rating'), // 1-5
  kpiScores: jsonb('kpi_scores'),
  strengths: text('strengths'),
  areasForImprovement: text('areas_for_improvement'),
  goals: jsonb('goals'),
  feedback: text('feedback'),
  status: varchar('status', { length: 20 }).default('draft'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Payroll = typeof payrolls.$inferSelect;
export type NewPayroll = typeof payrolls.$inferInsert;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type NewLeaveRequest = typeof leaveRequests.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type NewPerformanceReview = typeof performanceReviews.$inferInsert;

