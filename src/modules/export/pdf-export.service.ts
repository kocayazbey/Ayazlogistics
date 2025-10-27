import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class PDFExportService {
  async generateInvoicePDF(invoiceData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('FATURA / INVOICE', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`);
      doc.text(`Date: ${invoiceData.invoiceDate}`);
      doc.text(`Due Date: ${invoiceData.dueDate}`);
      doc.moveDown();

      doc.fontSize(14).text('Bill To:', { underline: true });
      doc.fontSize(12);
      doc.text(invoiceData.customerName || 'Customer Name');
      doc.text(invoiceData.customerAddress || 'Customer Address');
      doc.moveDown();

      doc.fontSize(14).text('Invoice Details:', { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      doc.fontSize(10);
      doc.text('Description', 50, tableTop, { width: 200 });
      doc.text('Quantity', 270, tableTop, { width: 60 });
      doc.text('Unit Price', 350, tableTop, { width: 80 });
      doc.text('Total', 450, tableTop, { width: 80 });

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let yPosition = tableTop + 25;
      const lineItems = invoiceData.lineItems || [];

      lineItems.forEach((item: any) => {
        doc.text(item.description, 50, yPosition, { width: 200 });
        doc.text(item.quantity.toString(), 270, yPosition, { width: 60 });
        doc.text(item.unitPrice.toString(), 350, yPosition, { width: 80 });
        doc.text(item.total.toString(), 450, yPosition, { width: 80 });
        yPosition += 20;
      });

      doc.moveDown(2);
      doc.fontSize(12);
      doc.text(`Subtotal: ${invoiceData.subtotal} ${invoiceData.currency}`, { align: 'right' });
      doc.text(`Tax (20%): ${invoiceData.taxAmount} ${invoiceData.currency}`, { align: 'right' });
      doc.fontSize(14);
      doc.text(`Total: ${invoiceData.totalAmount} ${invoiceData.currency}`, { align: 'right', underline: true });

      doc.end();
    });
  }

  async generateReportPDF(title: string, data: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);

      data.forEach((item, index) => {
        doc.fontSize(12).text(`${index + 1}. ${JSON.stringify(item)}`);
        doc.moveDown(0.5);
      });

      doc.end();
    });
  }
}

