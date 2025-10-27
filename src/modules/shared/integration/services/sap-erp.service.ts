import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface SAPBusinessPartner {
  cardCode: string;
  cardName: string;
  cardType: 'C' | 'S'; // Customer or Supplier
  federalTaxID?: string;
  phone1?: string;
  emailAddress?: string;
  address?: string;
  city?: string;
  country?: string;
  currency?: string;
  paymentTerms?: number;
}

interface SAPSalesOrder {
  docNum?: string;
  docDate: Date;
  cardCode: string;
  comments?: string;
  documentLines: Array<{
    itemCode: string;
    itemDescription?: string;
    quantity: number;
    price: number;
    warehouseCode?: string;
    taxCode?: string;
    discountPercent?: number;
  }>;
  currency?: string;
  docCurrency?: string;
}

interface SAPInvoice {
  docNum?: string;
  docDate: Date;
  cardCode: string;
  comments?: string;
  documentLines: Array<{
    itemCode: string;
    itemDescription?: string;
    quantity: number;
    price: number;
    warehouseCode?: string;
    taxCode?: string;
    discountPercent?: number;
  }>;
  currency?: string;
}

interface SAPGoodsReceipt {
  docDate: Date;
  comments?: string;
  documentLines: Array<{
    itemCode: string;
    quantity: number;
    warehouseCode: string;
    price?: number;
  }>;
}

@Injectable()
export class SAPERPService {
  private readonly logger = new Logger(SAPERPService.name);
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly companyDB: string;
  private sessionId: string | null = null;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('SAP_USERNAME') || '';
    this.password = this.configService.get<string>('SAP_PASSWORD') || '';
    this.companyDB = this.configService.get<string>('SAP_COMPANY_DB') || '';

    const baseUrl = this.configService.get<string>('SAP_SERVICE_LAYER_URL') || 'https://localhost:50000/b1s/v1';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'odata.maxpagesize=100',
      },
      timeout: 60000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
      }),
    });
  }

  async login(): Promise<boolean> {
    try {
      const response = await this.client.post('/Login', {
        CompanyDB: this.companyDB,
        UserName: this.username,
        Password: this.password,
      });

      this.sessionId = response.data?.SessionId;
      
      if (this.sessionId) {
        this.client.defaults.headers.common['Cookie'] = `B1SESSION=${this.sessionId}`;
      }

      return !!this.sessionId;
    } catch (error: any) {
      this.logger.error(`SAP login failed: ${error.message}`);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.sessionId) {
        await this.client.post('/Logout');
        this.sessionId = null;
        delete this.client.defaults.headers.common['Cookie'];
      }
    } catch (error: any) {
      this.logger.error(`SAP logout failed: ${error.message}`);
    }
  }

  async createBusinessPartner(partner: SAPBusinessPartner, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating SAP business partner for tenant ${tenantId}`);

      await this.login();

      const response = await this.client.post('/BusinessPartners', {
        CardCode: partner.cardCode,
        CardName: partner.cardName,
        CardType: partner.cardType,
        FederalTaxID: partner.federalTaxID,
        Phone1: partner.phone1,
        EmailAddress: partner.emailAddress,
        Address: partner.address,
        City: partner.city,
        Country: partner.country,
        Currency: partner.currency || 'TRY',
        PayTermsGrpCode: partner.paymentTerms || -1,
      });

      return {
        success: true,
        cardCode: response.data?.CardCode,
      };
    } catch (error: any) {
      this.logger.error(`SAP business partner creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.error?.message?.value || error.message,
      };
    }
  }

  async getBusinessPartner(cardCode: string): Promise<any> {
    try {
      await this.login();

      const response = await this.client.get(`/BusinessPartners('${cardCode}')`);

      return {
        success: true,
        partner: response.data,
      };
    } catch (error: any) {
      this.logger.error(`SAP business partner retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createItem(item: {
    itemCode: string;
    itemName: string;
    itemType: 'itItems' | 'itServices';
    purchaseItem?: 'tYES' | 'tNO';
    salesItem?: 'tYES' | 'tNO';
    inventoryItem?: 'tYES' | 'tNO';
  }, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating SAP item for tenant ${tenantId}`);

      await this.login();

      const response = await this.client.post('/Items', {
        ItemCode: item.itemCode,
        ItemName: item.itemName,
        ItemType: item.itemType,
        PurchaseItem: item.purchaseItem || 'tYES',
        SalesItem: item.salesItem || 'tYES',
        InventoryItem: item.inventoryItem || 'tYES',
      });

      return {
        success: true,
        itemCode: response.data?.ItemCode,
      };
    } catch (error: any) {
      this.logger.error(`SAP item creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.error?.message?.value || error.message,
      };
    }
  }

  async createSalesOrder(order: SAPSalesOrder, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating SAP sales order for tenant ${tenantId}`);

      await this.login();

      const response = await this.client.post('/Orders', {
        DocDate: this.formatDate(order.docDate),
        CardCode: order.cardCode,
        Comments: order.comments,
        DocCurrency: order.docCurrency || 'TRY',
        DocumentLines: order.documentLines.map((line, index) => ({
          LineNum: index,
          ItemCode: line.itemCode,
          ItemDescription: line.itemDescription,
          Quantity: line.quantity,
          Price: line.price,
          WarehouseCode: line.warehouseCode || '01',
          TaxCode: line.taxCode || 'KDV18',
          DiscountPercent: line.discountPercent || 0,
        })),
      });

      return {
        success: true,
        docEntry: response.data?.DocEntry,
        docNum: response.data?.DocNum,
      };
    } catch (error: any) {
      this.logger.error(`SAP sales order creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.error?.message?.value || error.message,
      };
    }
  }

  async createInvoice(invoice: SAPInvoice, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating SAP invoice for tenant ${tenantId}`);

      await this.login();

      const response = await this.client.post('/Invoices', {
        DocDate: this.formatDate(invoice.docDate),
        CardCode: invoice.cardCode,
        Comments: invoice.comments,
        DocCurrency: invoice.currency || 'TRY',
        DocumentLines: invoice.documentLines.map((line, index) => ({
          LineNum: index,
          ItemCode: line.itemCode,
          ItemDescription: line.itemDescription,
          Quantity: line.quantity,
          Price: line.price,
          WarehouseCode: line.warehouseCode || '01',
          TaxCode: line.taxCode || 'KDV18',
          DiscountPercent: line.discountPercent || 0,
        })),
      });

      return {
        success: true,
        docEntry: response.data?.DocEntry,
        docNum: response.data?.DocNum,
      };
    } catch (error: any) {
      this.logger.error(`SAP invoice creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.error?.message?.value || error.message,
      };
    }
  }

  async createGoodsReceipt(receipt: SAPGoodsReceipt, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating SAP goods receipt for tenant ${tenantId}`);

      await this.login();

      const response = await this.client.post('/InventoryGenEntries', {
        DocDate: this.formatDate(receipt.docDate),
        Comments: receipt.comments,
        DocumentLines: receipt.documentLines.map((line, index) => ({
          LineNum: index,
          ItemCode: line.itemCode,
          Quantity: line.quantity,
          WarehouseCode: line.warehouseCode,
          Price: line.price || 0,
        })),
      });

      return {
        success: true,
        docEntry: response.data?.DocEntry,
      };
    } catch (error: any) {
      this.logger.error(`SAP goods receipt creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.error?.message?.value || error.message,
      };
    }
  }

  async getItemStock(itemCode: string, warehouseCode?: string): Promise<any> {
    try {
      await this.login();

      const filter = warehouseCode 
        ? `?$filter=WarehouseCode eq '${warehouseCode}'`
        : '';

      const response = await this.client.get(`/Items('${itemCode}')/ItemWarehouseInfoCollection${filter}`);

      return {
        success: true,
        stock: response.data?.value || [],
      };
    } catch (error: any) {
      this.logger.error(`SAP item stock retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

