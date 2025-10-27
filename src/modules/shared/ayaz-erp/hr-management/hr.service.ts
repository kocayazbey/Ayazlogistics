import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../../database/schema/shared/erp.schema';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Employee[]> {
    const query = this.employeeRepository.createQueryBuilder('employee')
      .where('employee.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('employee.status = :status', { status: filters.status });
    }

    if (filters?.department) {
      query.andWhere('employee.department = :department', { department: filters.department });
    }

    if (filters?.position) {
      query.andWhere('employee.position = :position', { position: filters.position });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Employee> {
    return this.employeeRepository.findOne({
      where: { id, tenantId },
      relations: ['department', 'manager'],
    });
  }

  async create(employeeData: Partial<Employee>, tenantId: string): Promise<Employee> {
    const employee = this.employeeRepository.create({
      ...employeeData,
      tenantId,
      employeeNumber: this.generateEmployeeNumber(),
      status: 'active',
    });
    return this.employeeRepository.save(employee);
  }

  async update(id: string, employeeData: Partial<Employee>, tenantId: string): Promise<Employee> {
    await this.employeeRepository.update({ id, tenantId }, employeeData);
    return this.findOne(id, tenantId);
  }

  async updateStatus(id: string, status: string, tenantId: string): Promise<Employee> {
    const employee = await this.findOne(id, tenantId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    employee.status = status;
    employee.statusUpdatedAt = new Date();
    return this.employeeRepository.save(employee);
  }

  async getEmployeeMetrics(tenantId: string): Promise<any> {
    const employees = await this.findAll(tenantId);
    
    const total = employees.length;
    const active = employees.filter(e => e.status === 'active').length;
    const inactive = employees.filter(e => e.status === 'inactive').length;
    const onLeave = employees.filter(e => e.status === 'on_leave').length;

    return {
      total,
      active,
      inactive,
      onLeave,
      retentionRate: total > 0 ? (active / total) * 100 : 0,
    };
  }

  async getDepartmentMetrics(tenantId: string): Promise<any> {
    const employees = await this.findAll(tenantId);
    
    const departments = {};
    for (const employee of employees) {
      if (employee.department) {
        departments[employee.department] = (departments[employee.department] || 0) + 1;
      }
    }

    return departments;
  }

  async getEmployeePerformance(employeeId: string, tenantId: string): Promise<any> {
    const employee = await this.findOne(employeeId, tenantId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    // Calculate performance metrics
    return {
      overallRating: 0,
      goalsAchieved: 0,
      totalGoals: 0,
      performanceScore: 0,
      lastReviewDate: null,
    };
  }

  async getPayrollSummary(tenantId: string, dateRange?: any): Promise<any> {
    const employees = await this.findAll(tenantId);
    
    const payroll = {
      totalEmployees: employees.length,
      totalSalary: 0,
      totalBenefits: 0,
      totalDeductions: 0,
      netPay: 0,
    };

    // Calculate payroll totals
    for (const employee of employees) {
      if (employee.salary) {
        payroll.totalSalary += employee.salary;
      }
    }

    payroll.netPay = payroll.totalSalary + payroll.totalBenefits - payroll.totalDeductions;
    
    return payroll;
  }

  async getAttendanceReport(tenantId: string, dateRange?: any): Promise<any> {
    const employees = await this.findAll(tenantId);
    
    const attendance = {
      totalEmployees: employees.length,
      present: 0,
      absent: 0,
      late: 0,
      attendanceRate: 0,
    };

    // Calculate attendance metrics
    // This would typically involve:
    // 1. Checking attendance records
    // 2. Calculating present/absent/late counts
    // 3. Computing attendance rates
    // 4. Identifying patterns

    return attendance;
  }

  private generateEmployeeNumber(): string {
    const timestamp = Date.now();
    return `EMP-${timestamp}`;
  }
}
