import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface EInvoiceData {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: Date;
  supplier: {
    vkn: string;
    name: string;
    taxOffice: string;
    address: string;
  };
  customer: {
    vkn: string;
    name: string;
    taxOffice: string;
    address: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    totalAmount: number;
  }>;
  totalAmount: number;
  totalVat: number;
  grandTotal: number;
}

@Injectable()
export class GIBEFaturaService {
  private readonly logger = new Logger(GIBEFaturaService.name);
  private readonly testUrl = 'https://efaturatest.gbv.gov.tr';
  private readonly prodUrl = 'https://efatura.gbv.gov.tr';
  private readonly username = process.env.GIB_USERNAME;
  private readonly password = process.env.GIB_PASSWORD;
  private readonly environment = process.env.GIB_ENVIRONMENT || 'test';
  private readonly enabled: boolean;

  constructor() {
    this.enabled = !!(this.username && this.password);
    
    if (this.enabled) {
      this.logger.log(`GIB E-Fatura service configured (${this.environment} environment)`);
    } else {
      this.logger.warn('GIB credentials not found. E-Fatura service disabled.');
    }
  }

  private get baseUrl(): string {
    return this.environment === 'production' ? this.prodUrl : this.testUrl;
  }

  async createEInvoice(invoiceData: EInvoiceData): Promise<any> {
    if (!this.enabled) {
      this.logger.warn('E-Invoice creation skipped - GIB not configured');
      return {
        success: false,
        uuid: `MOCK-EINVOICE-${Date.now()}`,
        message: 'E-Fatura service not configured',
      };
    }

    const ubl = this.generateUBL(invoiceData);

    try {
      const response = await axios.post(
        `${this.baseUrl}/earsiv-services/dispatch`,
        {
          vkn: invoiceData.supplier.vkn,
          invoiceUBL: ubl,
        },
        {
          auth: {
            username: this.username,
            password: this.password,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`E-Invoice created: ${invoiceData.invoiceNumber}`);
      return response.data;
    } catch (error) {
      this.logger.error('E-Invoice creation failed', error);
      throw error;
    }
  }

  async cancelEInvoice(uuid: string, reason: string): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Service not configured',
      };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/earsiv-services/cancel`,
        {
          uuid,
          reason,
        },
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        }
      );

      this.logger.log(`E-Invoice cancelled: ${uuid}`);
      return response.data;
    } catch (error) {
      this.logger.error('E-Invoice cancellation failed', error);
      throw error;
    }
  }

  async queryEInvoice(uuid: string): Promise<any> {
    if (!this.enabled) {
      return {
        success: false,
        message: 'Service not configured',
      };
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/earsiv-services/query/${uuid}`,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('E-Invoice query failed', error);
      throw error;
    }
  }

  async getEInvoiceHTML(uuid: string): Promise<string> {
    if (!this.enabled) {
      return '<html><body>E-Fatura service not configured</body></html>';
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/earsiv-services/html/${uuid}`,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('E-Invoice HTML retrieval failed', error);
      throw error;
    }
  }

  async getEInvoicePDF(uuid: string): Promise<Buffer> {
    if (!this.enabled) {
      throw new Error('E-Fatura service not configured');
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/earsiv-services/pdf/${uuid}`,
        {
          auth: {
            username: this.username,
            password: this.password,
          },
          responseType: 'arraybuffer',
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error('E-Invoice PDF retrieval failed', error);
      throw error;
    }
  }

  private generateUBL(invoiceData: EInvoiceData): string {
    const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <UBLVersionID>2.1</UBLVersionID>
  <UUID>${uuid}</UUID>
  <ID>${invoiceData.invoiceNumber}</ID>
  <IssueDate>${invoiceData.invoiceDate.toISOString().split('T')[0]}</IssueDate>
  <InvoiceTypeCode>SATIS</InvoiceTypeCode>
  <AccountingSupplierParty>
    <Party>
      <PartyIdentification>
        <ID schemeID="VKN">${invoiceData.supplier.vkn}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${invoiceData.supplier.name}</Name>
      </PartyName>
      <PostalAddress>
        <StreetName>${invoiceData.supplier.address}</StreetName>
      </PostalAddress>
    </Party>
  </AccountingSupplierParty>
  <AccountingCustomerParty>
    <Party>
      <PartyIdentification>
        <ID schemeID="VKN">${invoiceData.customer.vkn}</ID>
      </PartyIdentification>
      <PartyName>
        <Name>${invoiceData.customer.name}</Name>
      </PartyName>
    </Party>
  </AccountingCustomerParty>
  <LegalMonetaryTotal>
    <LineExtensionAmount currencyID="TRY">${invoiceData.totalAmount}</LineExtensionAmount>
    <TaxExclusiveAmount currencyID="TRY">${invoiceData.totalAmount}</TaxExclusiveAmount>
    <TaxInclusiveAmount currencyID="TRY">${invoiceData.grandTotal}</TaxInclusiveAmount>
    <PayableAmount currencyID="TRY">${invoiceData.grandTotal}</PayableAmount>
  </LegalMonetaryTotal>
</Invoice>`;
  }
}

