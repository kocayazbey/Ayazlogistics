import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { EventBusService } from '../../../core/events/event-bus.service';

interface ERPConfig {
  type: 'SAP' | 'NEBIM' | 'LOGO';
  host: string;
  username: string;
  password: string;
  apiKey?: string;
  database?: string;
  companyCode?: string;
}

interface ERPOrder {
  orderNumber: string;
  customerCode: string;
  orderDate: Date;
  items: Array<{
    sku: string;
    quantity: number;
    price: number;
  }>;
}

interface ERPInvoice {
  invoiceNumber: string;
  customerCode: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: Date;
}

@Injectable()
export class ERPSystemsService {
  private readonly logger = new Logger(ERPSystemsService.name);
  private clients: Map<string, AxiosInstance> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  // SAP Integration
  async connectSAP(config: ERPConfig): Promise<boolean> {
    try {
      const client = axios.create({
        baseURL: config.host,
        auth: {
          username: config.username,
          password: config.password,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Test connection
      await client.get('/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner');
      
      this.clients.set('SAP', client);
      this.logger.log('SAP connection established');
      
      return true;
    } catch (error) {
      this.logger.error('SAP connection failed:', error);
      return false;
    }
  }

  async syncSAPCustomers(tenantId: string): Promise<any[]> {
    const client = this.clients.get('SAP');
    if (!client) throw new Error('SAP not connected');

    try {
      const response = await client.get('/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner', {
        params: {
          $format: 'json',
          $top: 100,
        },
      });

      const customers = response.data.d.results.map((bp: any) => ({
        externalId: bp.BusinessPartner,
        name: bp.BusinessPartnerName,
        taxNumber: bp.TaxNumber,
        address: bp.StreetName,
        city: bp.CityName,
        country: bp.Country,
        email: bp.EmailAddress,
        phone: bp.PhoneNumber,
      }));

      await this.eventBus.emit('erp.customers.synced', { source: 'SAP', count: customers.length, tenantId });

      return customers;
    } catch (error) {
      this.logger.error('SAP customer sync failed:', error);
      throw error;
    }
  }

  async createSAPSalesOrder(order: ERPOrder): Promise<string> {
    const client = this.clients.get('SAP');
    if (!client) throw new Error('SAP not connected');

    try {
      const sapOrder = {
        SalesOrder: order.orderNumber,
        SoldToParty: order.customerCode,
        SalesOrderDate: order.orderDate.toISOString(),
        to_Item: {
          results: order.items.map((item, index) => ({
            SalesOrderItem: (index + 1) * 10,
            Material: item.sku,
            OrderQuantity: item.quantity,
            NetAmount: item.price * item.quantity,
          })),
        },
      };

      const response = await client.post('/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder', sapOrder);
      
      this.logger.log(`SAP sales order created: ${response.data.SalesOrder}`);
      return response.data.SalesOrder;
    } catch (error) {
      this.logger.error('SAP sales order creation failed:', error);
      throw error;
    }
  }

  async getSAPStockLevels(materialCodes: string[]): Promise<Map<string, number>> {
    const client = this.clients.get('SAP');
    if (!client) throw new Error('SAP not connected');

    const stockLevels = new Map<string, number>();

    for (const code of materialCodes) {
      try {
        const response = await client.get(`/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MaterialStock`, {
          params: {
            $filter: `Material eq '${code}'`,
            $format: 'json',
          },
        });

        const totalStock = response.data.d.results.reduce((sum: number, item: any) => {
          return sum + parseFloat(item.MatlWrhsStkQtyInMatlBaseUnit);
        }, 0);

        stockLevels.set(code, totalStock);
      } catch (error) {
        this.logger.warn(`Failed to get stock for ${code}:`, error);
        stockLevels.set(code, 0);
      }
    }

    return stockLevels;
  }

  // NEBIM Integration
  async connectNEBIM(config: ERPConfig): Promise<boolean> {
    try {
      const client = axios.create({
        baseURL: config.host,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });

      // Test connection
      await client.get('/api/v1/health');
      
      this.clients.set('NEBIM', client);
      this.logger.log('NEBIM connection established');
      
      return true;
    } catch (error) {
      this.logger.error('NEBIM connection failed:', error);
      return false;
    }
  }

  async syncNEBIMProducts(tenantId: string): Promise<any[]> {
    const client = this.clients.get('NEBIM');
    if (!client) throw new Error('NEBIM not connected');

    try {
      const response = await client.get('/api/v1/products', {
        params: {
          limit: 1000,
          offset: 0,
        },
      });

      const products = response.data.products.map((product: any) => ({
        externalId: product.productCode,
        name: product.productName,
        sku: product.barcode,
        category: product.categoryName,
        price: product.salePrice,
        cost: product.costPrice,
        stock: product.stockQuantity,
      }));

      await this.eventBus.emit('erp.products.synced', { source: 'NEBIM', count: products.length, tenantId });

      return products;
    } catch (error) {
      this.logger.error('NEBIM product sync failed:', error);
      throw error;
    }
  }

  async createNEBIMInvoice(invoice: ERPInvoice): Promise<string> {
    const client = this.clients.get('NEBIM');
    if (!client) throw new Error('NEBIM not connected');

    try {
      const nebimInvoice = {
        invoiceNumber: invoice.invoiceNumber,
        customerCode: invoice.customerCode,
        invoiceDate: new Date().toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        totalAmount: invoice.totalAmount,
        taxAmount: invoice.taxAmount,
        netAmount: invoice.amount,
      };

      const response = await client.post('/api/v1/invoices', nebimInvoice);
      
      this.logger.log(`NEBIM invoice created: ${response.data.invoiceNumber}`);
      return response.data.invoiceNumber;
    } catch (error) {
      this.logger.error('NEBIM invoice creation failed:', error);
      throw error;
    }
  }

  // LOGO Integration
  async connectLOGO(config: ERPConfig): Promise<boolean> {
    try {
      const client = axios.create({
        baseURL: config.host,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
          'X-Firm-Code': config.companyCode || '001',
        },
      });

      // Test connection
      await client.get('/api/system/info');
      
      this.clients.set('LOGO', client);
      this.logger.log('LOGO connection established');
      
      return true;
    } catch (error) {
      this.logger.error('LOGO connection failed:', error);
      return false;
    }
  }

  async syncLOGOCustomers(tenantId: string): Promise<any[]> {
    const client = this.clients.get('LOGO');
    if (!client) throw new Error('LOGO not connected');

    try {
      const response = await client.get('/api/customers', {
        params: {
          pageSize: 100,
          pageNumber: 1,
        },
      });

      const customers = response.data.items.map((customer: any) => ({
        externalId: customer.customerCode,
        name: customer.customerName,
        taxNumber: customer.taxNumber,
        address: customer.address,
        city: customer.city,
        country: customer.country,
        email: customer.email,
        phone: customer.phone,
      }));

      await this.eventBus.emit('erp.customers.synced', { source: 'LOGO', count: customers.length, tenantId });

      return customers;
    } catch (error) {
      this.logger.error('LOGO customer sync failed:', error);
      throw error;
    }
  }

  async postLOGOInventoryMovement(data: {
    warehouseCode: string;
    itemCode: string;
    quantity: number;
    movementType: 'IN' | 'OUT';
    reference?: string;
  }): Promise<string> {
    const client = this.clients.get('LOGO');
    if (!client) throw new Error('LOGO not connected');

    try {
      const movement = {
        warehouseCode: data.warehouseCode,
        itemCode: data.itemCode,
        quantity: data.quantity,
        movementType: data.movementType,
        movementDate: new Date().toISOString(),
        reference: data.reference,
      };

      const response = await client.post('/api/inventory/movements', movement);
      
      this.logger.log(`LOGO inventory movement posted: ${response.data.movementNumber}`);
      return response.data.movementNumber;
    } catch (error) {
      this.logger.error('LOGO inventory movement failed:', error);
      throw error;
    }
  }

  // Universal sync method
  async syncAllData(erpType: 'SAP' | 'NEBIM' | 'LOGO', tenantId: string): Promise<{
    customers: number;
    products: number;
    inventory: number;
  }> {
    const results = {
      customers: 0,
      products: 0,
      inventory: 0,
    };

    try {
      switch (erpType) {
        case 'SAP':
          const sapCustomers = await this.syncSAPCustomers(tenantId);
          results.customers = sapCustomers.length;
          break;

        case 'NEBIM':
          const nebimProducts = await this.syncNEBIMProducts(tenantId);
          results.products = nebimProducts.length;
          break;

        case 'LOGO':
          const logoCustomers = await this.syncLOGOCustomers(tenantId);
          results.customers = logoCustomers.length;
          break;
      }

      await this.eventBus.emit('erp.sync.completed', { erpType, results, tenantId });

      return results;
    } catch (error) {
      this.logger.error(`ERP sync failed for ${erpType}:`, error);
      throw error;
    }
  }

  disconnectAll() {
    this.clients.clear();
    this.logger.log('All ERP connections closed');
  }
}

