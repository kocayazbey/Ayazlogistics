import { Controller, Get, Post, Res, Query, Body } from '@nestjs/common';
import { Response } from 'express';
import { ExcelExportService } from './excel-export.service';
import { PDFExportService } from './pdf-export.service';
import { CSVExportService } from './csv-export.service';

@Controller('api/export')
export class ExportController {
  constructor(
    private readonly excelService: ExcelExportService,
    private readonly pdfService: PDFExportService,
    private readonly csvService: CSVExportService,
  ) {}

  @Get('invoices/excel')
  async exportInvoicesExcel(@Res() res: Response, @Query() query: any) {
    const buffer = await this.excelService.exportInvoices(query.data || []);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.xlsx');
    res.send(buffer);
  }

  @Get('invoices/pdf')
  async exportInvoicePDF(@Res() res: Response, @Query('id') id: string) {
    const buffer = await this.pdfService.generateInvoicePDF({ invoiceNumber: id });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id}.pdf`);
    res.send(buffer);
  }

  @Get('invoices/csv')
  async exportInvoicesCSV(@Res() res: Response) {
    const csv = await this.csvService.exportInvoicesToCSV([]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
    res.send(csv);
  }
}

