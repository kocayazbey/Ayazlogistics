import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface EIrsaliyeRequest {
  despatchNumber: string;
  despatchDate: Date;
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
  receiver: {
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
  carrier?: {
    title: string;
    taxNumber?: string;
    vehiclePlate?: string;
    driverName?: string;
    driverTcNo?: string;
  };
  lineItems: Array<{
    itemCode?: string;
    itemName: string;
    quantity: number;
    unitCode: string;
    unitPrice?: number;
    description?: string;
  }>;
  despatchType: 'SEVK' | 'GIRIS' | 'IADE';
  shipmentType?: 'KARA' | 'DENIZ' | 'HAVA' | 'DEMIRYOLU';
  notes?: string;
  orderNumber?: string;
  invoiceNumber?: string;
}

interface EIrsaliyeResponse {
  success: boolean;
  uuid?: string;
  despatchId?: string;
  htmlContent?: string;
  pdfUrl?: string;
  error?: string;
}

@Injectable()
export class EIrsaliyeService {
  private readonly logger = new Logger(EIrsaliyeService.name);
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly password: string;
  private readonly testMode: boolean;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('GIB_USERNAME') || '';
    this.password = this.configService.get<string>('GIB_PASSWORD') || '';
    this.testMode = this.configService.get<string>('GIB_TEST_MODE') === 'true';

    const baseUrl = this.testMode
      ? 'https://eirsaliyetest.gib.gov.tr'
      : 'https://eirsaliye.gib.gov.tr';

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      timeout: 60000,
    });
  }

  async login(): Promise<string | null> {
    try {
      const response = await this.client.post('/earsiv-services/esign', {
        assoscmd: 'login',
        rtype: 'json',
        userid: this.username,
        sifre: this.password,
      });

      const token = response.data?.token;
      if (token) {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      return token;
    } catch (error: any) {
      this.logger.error(`E-İrsaliye login failed: ${error.message}`);
      return null;
    }
  }

  async createDespatch(request: EIrsaliyeRequest, tenantId: string): Promise<EIrsaliyeResponse> {
    try {
      this.logger.log(`Creating E-İrsaliye for tenant ${tenantId}`);

      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const despatchData = {
        irsaliyeUuid: this.generateUUID(),
        irsaliyeNo: request.despatchNumber,
        irsaliyeTarihi: this.formatDate(request.despatchDate),
        irsaliyeTipi: request.despatchType,
        sevkiyatTipi: request.shipmentType || 'KARA',
        gonderenVknTckn: request.issuer.taxNumber,
        gonderenUnvan: request.issuer.title,
        gonderenVergiDairesi: request.issuer.taxOffice,
        gonderenAdres: request.issuer.address,
        gonderenSehir: request.issuer.city,
        gonderenIlce: request.issuer.district,
        gonderenUlke: request.issuer.country,
        gonderenTel: request.issuer.phone || '',
        gonderenEmail: request.issuer.email || '',
        aliciVknTckn: request.receiver.taxNumber || request.receiver.tcNo,
        aliciUnvan: request.receiver.title,
        aliciVergiDairesi: request.receiver.taxOffice || '',
        aliciAdres: request.receiver.address,
        aliciSehir: request.receiver.city,
        aliciIlce: request.receiver.district,
        aliciUlke: request.receiver.country,
        aliciTel: request.receiver.phone || '',
        aliciEmail: request.receiver.email || '',
        tasiyiciUnvan: request.carrier?.title || '',
        tasiyiciVkn: request.carrier?.taxNumber || '',
        aracPlaka: request.carrier?.vehiclePlate || '',
        soforAd: request.carrier?.driverName || '',
        soforTckn: request.carrier?.driverTcNo || '',
        malHizmetTable: request.lineItems.map((item, index) => ({
          malHizmet: item.itemName,
          malKodu: item.itemCode || '',
          miktar: item.quantity,
          birim: item.unitCode,
          birimFiyat: item.unitPrice || 0,
          aciklama: item.description || '',
          siraNo: index + 1,
        })),
        siparisNo: request.orderNumber || '',
        faturaNo: request.invoiceNumber || '',
        not: request.notes || '',
      };

      const response = await this.client.post('/earsiv-services/irsaliye', despatchData);

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Despatch creation failed');
      }

      return {
        success: true,
        uuid: response.data.uuid,
        despatchId: response.data.despatchId,
        htmlContent: response.data.htmlContent,
        pdfUrl: response.data.pdfUrl,
      };
    } catch (error: any) {
      this.logger.error(`E-İrsaliye creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  async getDespatch(uuid: string): Promise<any> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/irsaliye/${uuid}`);

      return {
        success: true,
        despatch: response.data,
      };
    } catch (error: any) {
      this.logger.error(`E-İrsaliye retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async cancelDespatch(uuid: string, reason: string): Promise<boolean> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.post('/earsiv-services/irsaliye/cancel', {
        uuid,
        cancelReason: reason,
      });

      return response.data?.success === true;
    } catch (error: any) {
      this.logger.error(`E-İrsaliye cancellation failed: ${error.message}`);
      return false;
    }
  }

  async getDespatchHTML(uuid: string): Promise<string | null> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/irsaliye/${uuid}/html`);

      return response.data?.html || null;
    } catch (error: any) {
      this.logger.error(`E-İrsaliye HTML retrieval failed: ${error.message}`);
      return null;
    }
  }

  async getDespatchPDF(uuid: string): Promise<Buffer | null> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/irsaliye/${uuid}/pdf`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      this.logger.error(`E-İrsaliye PDF retrieval failed: ${error.message}`);
      return null;
    }
  }

  async sendDespatchEmail(uuid: string, email: string): Promise<boolean> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.post('/earsiv-services/irsaliye/send-email', {
        uuid,
        email,
      });

      return response.data?.success === true;
    } catch (error: any) {
      this.logger.error(`E-İrsaliye email sending failed: ${error.message}`);
      return false;
    }
  }

  async getDespatchStatus(uuid: string): Promise<any> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get(`/earsiv-services/irsaliye/${uuid}/status`);

      return {
        success: true,
        status: response.data?.status,
        statusDescription: response.data?.statusDescription,
      };
    } catch (error: any) {
      this.logger.error(`E-İrsaliye status check failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getDespatchList(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.get('/earsiv-services/irsaliye/list', {
        params: {
          startDate: this.formatDate(startDate),
          endDate: this.formatDate(endDate),
        },
      });

      return response.data?.despatches || [];
    } catch (error: any) {
      this.logger.error(`E-İrsaliye list retrieval failed: ${error.message}`);
      return [];
    }
  }

  async receiveDespatch(uuid: string, receivedBy: string, receivedDate: Date): Promise<boolean> {
    try {
      const token = await this.login();
      if (!token) {
        throw new Error('Authentication failed');
      }

      const response = await this.client.post('/earsiv-services/irsaliye/receive', {
        uuid,
        receivedBy,
        receivedDate: this.formatDate(receivedDate),
      });

      return response.data?.success === true;
    } catch (error: any) {
      this.logger.error(`E-İrsaliye receiving failed: ${error.message}`);
      return false;
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
}

