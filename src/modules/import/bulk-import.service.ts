import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';

@Injectable()
export class BulkImportService {
  async importCustomersFromCSV(fileBuffer: Buffer): Promise<{ success: number; failed: number; errors: any[] }> {
    const records = parse(fileBuffer, { columns: true, skip_empty_lines: true });
    let success = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const record of records) {
      try {
        await this.validateAndImportCustomer(record);
        success++;
      } catch (error) {
        failed++;
        errors.push({ record, error: error.message });
      }
    }

    return { success, failed, errors };
  }

  private async validateAndImportCustomer(record: any): Promise<void> {
    if (!record.name || !record.email) {
      throw new Error('Name and email are required');
    }
  }

  async getImportTemplate(type: 'customers' | 'invoices' | 'shipments'): Promise<string> {
    const templates = {
      customers: 'name,type,contact,email,phone,address\n',
      invoices: 'invoiceNumber,customer,amount,status,date\n',
      shipments: 'id,customer,origin,destination,status\n',
    };
    return templates[type];
  }
}

