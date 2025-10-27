import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface LogoCustomer {
  code: string;
  title: string;
  taxNumber?: string;
  taxOffice?: string;
  address?: string;
  city?: string;
  district?: string;
  phone?: string;
  email?: string;
}

interface LogoInvoice {
  invoiceNumber: string;
  invoiceDate: Date;
  customerCode: string;
  warehouseCode: string;
  description?: string;
  lineItems: Array<{
    itemCode: string;
    itemName: string;
    quantity: number;
    unitCode: string;
    unitPrice: number;
    vatRate: number;
    discount?: number;
    total: number;
  }>;
  paymentType?: string;
  currency?: string;
}

interface LogoStockCard {
  itemCode: string;
  itemName: string;
  itemType: number;
  unitCode: string;
  unitPrice?: number;
  purchasePrice?: number;
  vatRate?: number;
  gtipCode?: string;
  barcode?: string;
}

@Injectable()
export class LogoERPService {
  private readonly logger = new Logger(LogoERPService.name);
  private readonly client: AxiosInstance;
  private readonly firm: string;
  private readonly period: string;
  private readonly username: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService) {
    this.firm = this.configService.get<string>('LOGO_FIRM') || '001';
    this.period = this.configService.get<string>('LOGO_PERIOD') || '01';
    this.username = this.configService.get<string>('LOGO_USERNAME') || '';
    this.password = this.configService.get<string>('LOGO_PASSWORD') || '';

    const baseUrl = this.configService.get<string>('LOGO_API_URL') || 'http://localhost:5000';

    this.client = axios.create({
      baseURL: `${baseUrl}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async authenticate(): Promise<string | null> {
    try {
      const response = await this.client.post('/auth/login', {
        username: this.username,
        password: this.password,
        firm: this.firm,
        period: this.period,
      });

      const token = response.data?.token;
      if (token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      return token;
    } catch (error: any) {
      this.logger.error(`Logo ERP authentication failed: ${error.message}`);
      return null;
    }
  }

  async createCustomer(customer: LogoCustomer, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Logo customer for tenant ${tenantId}`);

      await this.authenticate();

      const response = await this.client.post(`/v1/${this.firm}/${this.period}/customers`, {
        CODE: customer.code,
        DEFINITION_: customer.title,
        TAXNR: customer.taxNumber || '',
        TAXOFFICE: customer.taxOffice || '',
        ADDR1: customer.address || '',
        CITY: customer.city || '',
        DISTRICT: customer.district || '',
        TELNRS1: customer.phone || '',
        EMAILADDR: customer.email || '',
        ACTIVE: 1,
      });

      return {
        success: true,
        customerCode: response.data?.CODE,
        logId: response.data?.LOGICALREF,
      };
    } catch (error: any) {
      this.logger.error(`Logo customer creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getCustomer(customerCode: string): Promise<any> {
    try {
      await this.authenticate();

      const response = await this.client.get(`/v1/${this.firm}/${this.period}/customers/${customerCode}`);

      return {
        success: true,
        customer: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Logo customer retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createStockCard(stockCard: LogoStockCard, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Logo stock card for tenant ${tenantId}`);

      await this.authenticate();

      const response = await this.client.post(`/v1/${this.firm}/${this.period}/items`, {
        CODE: stockCard.itemCode,
        NAME: stockCard.itemName,
        CARDTYPE: stockCard.itemType,
        UNITSETREF: 1, // Default unit set
        UNITCODE: stockCard.unitCode,
        PURCHPRICE: stockCard.purchasePrice || 0,
        SALEPRICE: stockCard.unitPrice || 0,
        VAT: stockCard.vatRate || 18,
        GTIPCODE: stockCard.gtipCode || '',
        BARCODE: stockCard.barcode || '',
        ACTIVE: 1,
      });

      return {
        success: true,
        itemCode: response.data?.CODE,
        logId: response.data?.LOGICALREF,
      };
    } catch (error: any) {
      this.logger.error(`Logo stock card creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getStockCard(itemCode: string): Promise<any> {
    try {
      await this.authenticate();

      const response = await this.client.get(`/v1/${this.firm}/${this.period}/items/${itemCode}`);

      return {
        success: true,
        item: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Logo stock card retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createInvoice(invoice: LogoInvoice, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Logo invoice for tenant ${tenantId}`);

      await this.authenticate();

      const response = await this.client.post(`/v1/${this.firm}/${this.period}/salesInvoices`, {
        FICHENO: invoice.invoiceNumber,
        DATE_: this.formatDate(invoice.invoiceDate),
        CLIENTREF: invoice.customerCode,
        SOURCEINDEX: parseInt(invoice.warehouseCode) || 1,
        GENEXP1: invoice.description || '',
        TRANSACTIONS: invoice.lineItems.map((item, index) => ({
          TYPE: 0, // Sales
          LINENUM: index + 1,
          ITEMREF: item.itemCode,
          ITEMNAME: item.itemName,
          AMOUNT: item.quantity,
          UNITCODE: item.unitCode,
          PRICE: item.unitPrice,
          VAT: item.vatRate,
          DISCPER: item.discount || 0,
          TOTAL: item.total,
        })),
        PAYMENTTYPE: invoice.paymentType || '1',
        CURRENCY: invoice.currency || 'TRY',
      });

      return {
        success: true,
        invoiceNumber: response.data?.FICHENO,
        logId: response.data?.LOGICALREF,
      };
    } catch (error: any) {
      this.logger.error(`Logo invoice creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getInvoice(invoiceNumber: string): Promise<any> {
    try {
      await this.authenticate();

      const response = await this.client.get(`/v1/${this.firm}/${this.period}/salesInvoices/${invoiceNumber}`);

      return {
        success: true,
        invoice: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Logo invoice retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createStockMovement(movement: {
    itemCode: string;
    warehouseCode: string;
    quantity: number;
    movementType: number;
    description?: string;
    date?: Date;
  }, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Logo stock movement for tenant ${tenantId}`);

      await this.authenticate();

      const response = await this.client.post(`/v1/${this.firm}/${this.period}/stockTransactions`, {
        TYPE: movement.movementType,
        ITEMREF: movement.itemCode,
        SOURCEINDEX: parseInt(movement.warehouseCode) || 1,
        AMOUNT: movement.quantity,
        DATE_: movement.date ? this.formatDate(movement.date) : this.formatDate(new Date()),
        GENEXP1: movement.description || '',
      });

      return {
        success: true,
        transactionId: response.data?.LOGICALREF,
      };
    } catch (error: any) {
      this.logger.error(`Logo stock movement creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getStockBalance(itemCode: string, warehouseCode?: string): Promise<any> {
    try {
      await this.authenticate();

      const params = warehouseCode ? { warehouse: warehouseCode } : {};

      const response = await this.client.get(
        `/v1/${this.firm}/${this.period}/items/${itemCode}/stock`,
        { params },
      );

      return {
        success: true,
        balance: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Logo stock balance retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createGLEntry(entry: {
    accountCode: string;
    debit?: number;
    credit?: number;
    description: string;
    date?: Date;
  }, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Logo GL entry for tenant ${tenantId}`);

      await this.authenticate();

      const response = await this.client.post(`/v1/${this.firm}/${this.period}/glTransactions`, {
        ACCOUNTREF: entry.accountCode,
        DEBIT: entry.debit || 0,
        CREDIT: entry.credit || 0,
        LINEEXP: entry.description,
        DATE_: entry.date ? this.formatDate(entry.date) : this.formatDate(new Date()),
      });

      return {
        success: true,
        transactionId: response.data?.LOGICALREF,
      };
    } catch (error: any) {
      this.logger.error(`Logo GL entry creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getGLBalance(accountCode: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      await this.authenticate();

      const params: any = {};
      if (startDate) params.startDate = this.formatDate(startDate);
      if (endDate) params.endDate = this.formatDate(endDate);

      const response = await this.client.get(
        `/v1/${this.firm}/${this.period}/accounts/${accountCode}/balance`,
        { params },
      );

      return {
        success: true,
        balance: response.data,
      };
    } catch (error: any) {
      this.logger.error(`Logo GL balance retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getCustomerBalance(customerCode: string): Promise<any> {
    try {
      await this.authenticate();

      const response = await this.client.get(
        `/v1/${this.firm}/${this.period}/customers/${customerCode}/balance`,
      );

      return {
        success: true,
        balance: response.data?.BALANCE || 0,
        debit: response.data?.DEBIT || 0,
        credit: response.data?.CREDIT || 0,
      };
    } catch (error: any) {
      this.logger.error(`Logo customer balance retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async syncInventory(items: Array<{ itemCode: string; warehouseCode: string; quantity: number }>): Promise<any> {
    try {
      await this.authenticate();

      const results = [];

      for (const item of items) {
        const result = await this.createStockMovement(
          {
            itemCode: item.itemCode,
            warehouseCode: item.warehouseCode,
            quantity: item.quantity,
            movementType: 11, // Inventory adjustment
            description: 'WMS Sync',
          },
          'system',
        );

        results.push(result);
      }

      return {
        success: true,
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      };
    } catch (error: any) {
      this.logger.error(`Logo inventory sync failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
}

