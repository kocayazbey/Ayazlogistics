import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface ESMMData {
  belgeNo: string;
  tarih: Date;
  hizmetAlan: {
    tcKimlikNo?: string;
    vergiKimlikNo?: string;
    adi: string;
    adres: string;
  };
  hizmetVeren: {
    tcKimlikNo: string;
    adi: string;
    meslek: string;
  };
  hizmetAciklamasi: string;
  brutUcret: number;
  stopajOrani: number;
  stopajTutari: number;
  netUcret: number;
}

@Injectable()
export class ESMMService {
  private readonly apiUrl = process.env.GIB_ESMM_API_URL;
  private readonly kullaniciKodu = process.env.GIB_KULLANICI_KODU;
  private readonly sifre = process.env.GIB_SIFRE;

  async createESMM(data: ESMMData, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/ESMMService`,
        {
          ...data,
          kullaniciKodu: this.kullaniciKodu,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            username: this.kullaniciKodu,
            password: this.sifre,
          },
        },
      );

      return {
        belgeNo: response.data.belgeNo,
        ettn: response.data.ettn,
        onayDurumu: response.data.onayDurumu,
      };
    } catch (error) {
      throw new Error(`E-SMM creation failed: ${error.message}`);
    }
  }

  async cancelESMM(belgeNo: string, tenantId: string): Promise<void> {
    try {
      await axios.post(
        `${this.apiUrl}/ESMMService/cancel`,
        { belgeNo },
        {
          auth: {
            username: this.kullaniciKodu,
            password: this.sifre,
          },
        },
      );
    } catch (error) {
      throw new Error(`E-SMM cancellation failed: ${error.message}`);
    }
  }
}

