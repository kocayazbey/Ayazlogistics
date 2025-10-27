import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExportService {
  async exportInvoices(invoices: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    worksheet.columns = [
      { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
      { header: 'Customer', key: 'customer', width: 30 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Due Date', key: 'dueDate', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    invoices.forEach((invoice) => {
      worksheet.addRow(invoice);
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  async exportCustomers(customers: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Customers');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Contact', key: 'contact', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Revenue', key: 'revenue', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    customers.forEach((customer) => {
      worksheet.addRow(customer);
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  async exportShipments(shipments: any[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Shipments');

    worksheet.columns = [
      { header: 'Shipment ID', key: 'id', width: 20 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Origin', key: 'origin', width: 20 },
      { header: 'Destination', key: 'destination', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Progress', key: 'progress', width: 10 },
      { header: 'ETA', key: 'eta', width: 15 },
      { header: 'Driver', key: 'driver', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    shipments.forEach((shipment) => {
      worksheet.addRow(shipment);
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}

