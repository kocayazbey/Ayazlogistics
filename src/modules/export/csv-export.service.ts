import { Injectable } from '@nestjs/common';

@Injectable()
export class CSVExportService {
  async exportToCSV(data: any[], headers: string[]): Promise<string> {
    if (data.length === 0) {
      return headers.join(',');
    }

    const csvRows = [headers.join(',')];

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  async exportInvoicesToCSV(invoices: any[]): Promise<string> {
    const headers = ['invoiceNumber', 'customer', 'amount', 'status', 'date', 'dueDate'];
    return this.exportToCSV(invoices, headers);
  }

  async exportCustomersToCSV(customers: any[]): Promise<string> {
    const headers = ['name', 'type', 'contact', 'email', 'phone', 'revenue', 'status'];
    return this.exportToCSV(customers, headers);
  }

  async exportShipmentsToCSV(shipments: any[]): Promise<string> {
    const headers = ['id', 'customer', 'origin', 'destination', 'status', 'progress', 'eta', 'driver'];
    return this.exportToCSV(shipments, headers);
  }
}

