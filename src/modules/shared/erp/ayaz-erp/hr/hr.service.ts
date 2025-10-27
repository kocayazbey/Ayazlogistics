import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Position } from './entities/position.entity';
import { Attendance } from './entities/attendance.entity';
import { Performance } from './entities/performance.entity';
import { Benefit } from './entities/benefit.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreatePositionDto } from './dto/create-position.dto';

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Performance)
    private readonly performanceRepository: Repository<Performance>,
    @InjectRepository(Benefit)
    private readonly benefitRepository: Repository<Benefit>
  ) {}

  async getEmployees(filters: {
    tenantId: string;
    department?: string;
    position?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .where('employee.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.position', 'position')
      .orderBy('employee.createdAt', 'DESC');

    if (filters.department) {
      query.andWhere('employee.departmentId = :departmentId', { departmentId: filters.department });
    }

    if (filters.position) {
      query.andWhere('employee.positionId = :positionId', { positionId: filters.position });
    }

    if (filters.status) {
      query.andWhere('employee.status = :status', { status: filters.status });
    }

    if (filters.search) {
      query.andWhere(
        '(employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.email ILIKE :search OR employee.employeeId ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [employees, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      employees,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getEmployeesStats(tenantId: string) {
    const totalEmployees = await this.employeeRepository.count({
      where: { tenantId }
    });

    const activeEmployees = await this.employeeRepository.count({
      where: { tenantId, status: 'active' }
    });

    const inactiveEmployees = await this.employeeRepository.count({
      where: { tenantId, status: 'inactive' }
    });

    const avgSalary = await this.employeeRepository
      .createQueryBuilder('employee')
      .where('employee.tenantId = :tenantId', { tenantId })
      .andWhere('employee.status = :status', { status: 'active' })
      .select('AVG(employee.salary)', 'avgSalary')
      .getRawOne();

    const departmentStats = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoin('employee.department', 'department')
      .where('employee.tenantId = :tenantId', { tenantId })
      .andWhere('employee.status = :status', { status: 'active' })
      .select(['department.name', 'COUNT(employee.id) as count'])
      .groupBy('department.id, department.name')
      .getRawMany();

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      avgSalary: parseFloat(avgSalary.avgSalary) || 0,
      departmentBreakdown: departmentStats.map(stat => ({
        department: stat.department_name,
        count: parseInt(stat.count)
      }))
    };
  }

  async getDepartments(tenantId: string) {
    return this.departmentRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' }
    });
  }

  async getPositions(tenantId: string) {
    return this.positionRepository.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' }
    });
  }

  async getEmployee(id: string, tenantId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id, tenantId },
      relations: ['department', 'position', 'benefits']
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async createEmployee(createEmployeeDto: CreateEmployeeDto, userId: string, tenantId: string) {
    const employee = this.employeeRepository.create({
      ...createEmployeeDto,
      tenantId,
      createdBy: userId,
      status: 'active'
    });

    return this.employeeRepository.save(employee);
  }

  async updateEmployee(id: string, updateEmployeeDto: UpdateEmployeeDto, userId: string, tenantId: string) {
    const employee = await this.getEmployee(id, tenantId);

    Object.assign(employee, updateEmployeeDto);
    employee.updatedBy = userId;
    employee.updatedAt = new Date();

    return this.employeeRepository.save(employee);
  }

  async createDepartment(createDepartmentDto: CreateDepartmentDto, userId: string, tenantId: string) {
    const department = this.departmentRepository.create({
      ...createDepartmentDto,
      tenantId,
      createdBy: userId,
      isActive: true
    });

    return this.departmentRepository.save(department);
  }

  async createPosition(createPositionDto: CreatePositionDto, userId: string, tenantId: string) {
    const position = this.positionRepository.create({
      ...createPositionDto,
      tenantId,
      createdBy: userId,
      isActive: true
    });

    return this.positionRepository.save(position);
  }

  async getEmployeeAttendance(id: string, tenantId: string, filters: { startDate?: string; endDate?: string }) {
    await this.getEmployee(id, tenantId); // Verify employee exists

    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.employeeId = :employeeId', { employeeId: id })
      .orderBy('attendance.date', 'DESC');

    if (filters.startDate) {
      query.andWhere('attendance.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('attendance.date <= :endDate', { endDate: filters.endDate });
    }

    const attendance = await query.getMany();

    const totalDays = attendance.length;
    const presentDays = attendance.filter(record => record.status === 'present').length;
    const absentDays = attendance.filter(record => record.status === 'absent').length;
    const lateDays = attendance.filter(record => record.status === 'late').length;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
      records: attendance
    };
  }

  async getEmployeePerformance(id: string, tenantId: string, year?: string) {
    await this.getEmployee(id, tenantId); // Verify employee exists

    const query = this.performanceRepository
      .createQueryBuilder('performance')
      .where('performance.employeeId = :employeeId', { employeeId: id })
      .orderBy('performance.year', 'DESC')
      .addOrderBy('performance.quarter', 'DESC');

    if (year) {
      query.andWhere('performance.year = :year', { year: parseInt(year) });
    }

    const performance = await query.getMany();

    const avgRating = performance.length > 0 
      ? performance.reduce((sum, record) => sum + record.rating, 0) / performance.length 
      : 0;

    return {
      avgRating,
      totalReviews: performance.length,
      records: performance
    };
  }

  async getEmployeeBenefits(id: string, tenantId: string) {
    await this.getEmployee(id, tenantId); // Verify employee exists

    return this.benefitRepository.find({
      where: { employeeId: id },
      order: { createdAt: 'DESC' }
    });
  }

  async getPayrollReport(tenantId: string, filters: { month?: string; year?: string }) {
    const month = filters.month ? parseInt(filters.month) : new Date().getMonth() + 1;
    const year = filters.year ? parseInt(filters.year) : new Date().getFullYear();

    const employees = await this.employeeRepository.find({
      where: { tenantId, status: 'active' },
      relations: ['department', 'position']
    });

    const payrollData = employees.map(employee => {
      const grossSalary = employee.salary;
      const taxAmount = grossSalary * 0.2; // Simplified tax calculation
      const netSalary = grossSalary - taxAmount;

      return {
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name,
        position: employee.position?.name,
        grossSalary,
        taxAmount,
        netSalary
      };
    });

    const totalGrossSalary = payrollData.reduce((sum, employee) => sum + employee.grossSalary, 0);
    const totalTaxAmount = payrollData.reduce((sum, employee) => sum + employee.taxAmount, 0);
    const totalNetSalary = payrollData.reduce((sum, employee) => sum + employee.netSalary, 0);

    return {
      period: { month, year },
      totalEmployees: employees.length,
      totalGrossSalary,
      totalTaxAmount,
      totalNetSalary,
      employees: payrollData
    };
  }

  async getAttendanceReport(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const attendance = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .where('attendance.date >= :startDate', { startDate })
      .andWhere('attendance.date <= :endDate', { endDate })
      .orderBy('attendance.date', 'DESC')
      .getMany();

    const totalDays = attendance.length;
    const presentDays = attendance.filter(record => record.status === 'present').length;
    const absentDays = attendance.filter(record => record.status === 'absent').length;
    const lateDays = attendance.filter(record => record.status === 'late').length;

    const departmentStats = attendance.reduce((acc, record) => {
      const dept = record.employee.department?.name || 'No Department';
      if (!acc[dept]) {
        acc[dept] = { total: 0, present: 0, absent: 0, late: 0 };
      }
      acc[dept].total++;
      acc[dept][record.status]++;
      return acc;
    }, {});

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0
      },
      departmentStats,
      records: attendance
    };
  }
}
