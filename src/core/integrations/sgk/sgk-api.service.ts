import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface EmployeeDeclaration {
  employeeId: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  hireDate: Date;
  salary: number;
  jobCode: string;
}

interface PayrollDeclaration {
  period: { year: number; month: number };
  employees: Array<{
    nationalId: string;
    grossSalary: number;
    netSalary: number;
    sgkBase: number;
    workingDays: number;
  }>;
}

@Injectable()
export class SGKAPIService {
  private readonly logger = new Logger(SGKAPIService.name);
  private readonly apiUrl = process.env.SGK_API_URL || '';

  async submitEmployeeDeclaration(declaration: EmployeeDeclaration): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/declarations/employee`, {
        ...declaration,
        companyCode: process.env.SGK_COMPANY_CODE,
      }, {
        headers: this.getHeaders(),
      });

      this.logger.log(`Employee declaration submitted for ${declaration.nationalId}`);
      return response.data.declarationId;
    } catch (error) {
      this.logger.error('Employee declaration failed:', error);
      throw error;
    }
  }

  async submitPayrollDeclaration(declaration: PayrollDeclaration): Promise<string> {
    try {
      const response = await axios.post(`${this.apiUrl}/declarations/payroll`, {
        ...declaration,
        companyCode: process.env.SGK_COMPANY_CODE,
      }, {
        headers: this.getHeaders(),
      });

      this.logger.log(`Payroll declaration submitted for ${declaration.period.year}/${declaration.period.month}`);
      return response.data.declarationId;
    } catch (error) {
      this.logger.error('Payroll declaration failed:', error);
      throw error;
    }
  }

  async getEmployeeStatus(nationalId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/employees/${nationalId}/status`, {
        headers: this.getHeaders(),
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Employee status check failed for ${nationalId}:`, error);
      throw error;
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${process.env.SGK_USERNAME}:${process.env.SGK_PASSWORD}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }
}

