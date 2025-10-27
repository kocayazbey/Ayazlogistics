import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GIBIntegrationService {
  private readonly apiUrl = process.env.GIB_API_URL;
  private readonly kullaniciKodu = process.env.GIB_KULLANICI_KODU;
  private readonly sifre = process.env.GIB_SIFRE;

  async verifyTaxNumber(vergiKimlikNo: string, tenantId: string): Promise<{
    valid: boolean;
    companyName?: string;
    taxOffice?: string;
  }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/VergiKimlikNoDogrulama`,
        { vergiKimlikNo },
        {
          auth: {
            username: this.kullaniciKodu,
            password: this.sifre,
          },
        },
      );

      return {
        valid: response.data.gecerli,
        companyName: response.data.unvan,
        taxOffice: response.data.vergiDairesi,
      };
    } catch (error) {
      throw new Error(`GIB tax number verification failed: ${error.message}`);
    }
  }

  async submitTaxDeclaration(declarationData: any, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/BeyanSubmit`,
        declarationData,
        {
          auth: {
            username: this.kullaniciKodu,
            password: this.sifre,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`GIB tax declaration failed: ${error.message}`);
    }
  }
}

