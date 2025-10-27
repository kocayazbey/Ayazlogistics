import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface EArsivInvoiceRequest {
  invoiceNumber: string;
  invoiceDate: Date;
  issuer: {
    taxNumber: string;
    taxOffice: string;
    title: string;
    address: string;
    city: string;
    district: string;
    country: string;
    phone?: string;
    email?: string;
  };
  customer: {
    taxNumber?: string;
    tcNo?: string;
    taxOffice?: string;
    title: string;
    address: string;
    city: string;
    district: string;
    country: string;
    phone?: string;
    email?: string;
  };
  lineItems: Array<{
    itemCode?: string;
    itemName: string;
    quantity: number;
    unitCode: string;
    unitPrice: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
    description?: string;
  }>;
  currency: string;
  exchangeRate?: number;
  notes?: string;
  paymentMethod?: string;
  paymentTerm?: string;
}

interface EArsivInvoiceResponse {
  success: boolean;
  uuid?: string;
  invoiceId?: string;
  htmlContent?: string;
  pdfUrl?: string;
  error?: string;
}

@Injectable()
export class EArsivFaturaService {
  private readonly logger = new Logger(EArsivFaturaService.name);
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly testMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('GIB_USERNAME') || '';
    this.password = this.configService.get<string>('GIB_PASSWORD') || '';
    this.testMode = this.configService.get<string>('GIB_TEST_MODE') === 'true';

    const baseUrl = this.testMode
      ? 'https://earsivportaltest.gib.gov.tr'
      : 'https://earsivportal.gib.gov.tr';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    });
  }

  async login(): Promise<string | null> {
    try {
      const response = await this.client.post('/earsiv-services/auth', {
        userid: this.username,
        password: this.password,
      });

      const token = response.data?.token;
      if (token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      return token;
    } catch (error: any) {
      this.logger.error(`E-Arşiv login failed: ${error.message}`);
      return null;
    }
  }

  async createInvoice(request: EArsivInvoiceRequest, tenantId: string): Promise<EArsivInvoiceResponse> {
    try {
      this.logger.log(`Creating E-Arşiv invoice for tenant ${tenantId}`);

      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const subtotal = request.lineItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalVat = request.lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
      const grandTotal = subtotal + totalVat;

      const invoiceData = {
        faturaUuid: this.generateUUID(),
        belgeNumarasi: request.invoiceNumber,
        faturaTarihi: this.formatDate(request.invoiceDate),
        saat: this.formatTime(request.invoiceDate),
        paraBirimi: request.currency,
        dovzTLkur: request.exchangeRate || 1,
        faturaTipi: 'SATIS',
        vknTckn: request.issuer.taxNumber,
        unvan: request.issuer.title,
        vergiDairesi: request.issuer.taxOffice,
        bulvarcaddesokak: request.issuer.address,
        binaAdi: '',
        binaNo: '',
        kapiNo: '',
        kasabaKoy: '',
        sehir: request.issuer.city,
        ilce: request.issuer.district,
        ulke: request.issuer.country,
        tel: request.issuer.phone || '',
        email: request.issuer.email || '',
        aliciVknTckn: request.customer.taxNumber || request.customer.tcNo,
        aliciUnvan: request.customer.title,
        aliciVergiDairesi: request.customer.taxOffice || '',
        aliciAdres: request.customer.address,
        aliciSehir: request.customer.city,
        aliciIlce: request.customer.district,
        aliciUlke: request.customer.country,
        aliciTel: request.customer.phone || '',
        aliciEmail: request.customer.email || '',
        malHizmetTable: request.lineItems.map((item, index) => ({
          malHizmet: item.itemName,
          miktar: item.quantity,
          birim: item.unitCode,
          birimFiyat: item.unitPrice,
          fiyat: item.totalAmount,
          kdvOrani: item.vatRate,
          kdvTutari: item.vatAmount,
          iskontoOrani: 0,
          iskontoTutari: 0,
          iskontoNedeni: '',
          malHizmetTutari: item.totalAmount,
          siraNo: index + 1,
        })),
        malhizmetToplamTutari: subtotal.toFixed(2),
        toplamIskonto: '0.00',
        hesaplanankdv: totalVat.toFixed(2),
        vergilerToplami: totalVat.toFixed(2),
        vergilerDahilToplamTutar: grandTotal.toFixed(2),
        odenecekTutar: grandTotal.toFixed(2),
        not: request.notes || '',
        odemeSekli: request.paymentMethod || 'KREDI_KARTI/BANKA_KARTI',
        odemevadesi: request.paymentTerm || '',
      };

      const response = await this.client.post('/earsiv-services/fattura', invoiceData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Invoice creation failed');
      }

      return {
        success: true,
        uuid: response.data.uuid,
        invoiceId: response.data.invoiceId,
        htmlContent: response.data.htmlContent,
        pdfUrl: response.data.pdfUrl,
      };
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getInvoice(uuid: string): Promise<any> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/fattura/${uuid}`);

      return {
        success: true,
        invoice: response.data,
      };
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cancelInvoice(uuid: string, reason: string): Promise<boolean> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.post('/earsiv-services/fattura/cancel', {
        uuid,
        cancelReason: reason,
      });

      return response.data?.success === true;
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice cancellation failed: ${error.message}`);
      return false;
    }
  }

  async getInvoiceHTML(uuid: string): Promise<string | null> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/fattura/${uuid}/html`);

      return response.data?.html || null;
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice HTML retrieval failed: ${error.message}`);
      return null;
    }
  }

  async getInvoicePDF(uuid: string): Promise<Buffer | null> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/fattura/${uuid}/pdf`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice PDF retrieval failed: ${error.message}`);
      return null;
    }
  }

  async sendInvoiceEmail(uuid: string, email: string): Promise<boolean> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.post('/earsiv-services/fattura/send-email', {
        uuid,
        email,
      });

      return response.data?.success === true;
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice email sending failed: ${error.message}`);
      return false;
    }
  }

  async getInvoiceStatus(uuid: string): Promise<any> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/fattura/${uuid}/status`);

      return {
        success: true,
        status: response.data?.status,
        statusDescription: response.data?.statusDescription,
      };
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice status check failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getInvoiceList(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get('/earsiv-services/fattura/list', {
        params: {
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
        },
      });

      return response.data?.invoices || [];
    } catch (error: any) {
      this.logger.error(`E-Arşiv invoice list retrieval failed: ${error.message}`);
      return [];
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }).toUpperCase();
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
}

