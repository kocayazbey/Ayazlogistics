import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface EMustahsilData {
  belgeNo: string;
  tarih: Date;
  aliciTcKimlikNo: string;
  aliciAdi: string;
  saticiTcKimlikNo: string;
  saticiAdi: string;
  urunListesi: Array<{
    urunAdi: string;
    miktar: number;
    birim: string;
    birimFiyat: number;
    toplam: number;
  }>;
  genelToplam: number;
}

@Injectable()
export class EMustahsilService {
  private readonly apiUrl = process.env.GIB_EMUSTAHSIL_API_URL;
  private readonly kullaniciKodu = process.env.GIB_KULLANICI_KODU;
  private readonly sifre = process.env.GIB_SIFRE;

  async createEMustahsil(data: EMustahsilData, tenantId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/EMustahsilService`,
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
        belgNo: response.data.belgeNo,
        ettn: response.data.ettn,
        onayDurumu: response.data.onayDurumu,
      };
    } catch (error) {
      throw new Error(`E-Müstahsil creation failed: ${error.message}`);
    }
  }

  async queryEMustahsil(belgeNo: string, tenantId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/EMustahsilService/query/${belgeNo}`,
        {
          auth: {
            username: this.kullaniciKodu,
            password: this.sifre,
          },
        },
      );

      return response.data;
    } catch (error) {
      throw new Error(`E-Müstahsil query failed: ${error.message}`);
    }
  }
}

