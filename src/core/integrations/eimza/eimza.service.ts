import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class EImzaService {
  private readonly logger = new Logger(EImzaService.name);
  private readonly apiUrl = process.env.EIMZA_API_URL || 'https://eimza.e-tugra.com/api';

  async signDocument(documentId: string, documentData: Buffer): Promise<any> {
    try {
      const response = await axios.post(`${this.apiUrl}/sign`, {
        document: documentData.toString('base64'),
        documentId,
        username: process.env.EIMZA_USERNAME,
        password: process.env.EIMZA_PASSWORD,
        companyCode: process.env.EIMZA_COMPANY_CODE,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      this.logger.log(`Document signed: ${documentId}`);
      return {
        signedDocument: Buffer.from(response.data.signedDocument, 'base64'),
        signature: response.data.signature,
        certificate: response.data.certificate,
        timestamp: response.data.timestamp,
      };
    } catch (error) {
      this.logger.error(`Document signing failed for ${documentId}:`, error);
      throw error;
    }
  }

  async verifySignature(documentData: Buffer, signature: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.apiUrl}/verify`, {
        document: documentData.toString('base64'),
        signature,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data.valid === true;
    } catch (error) {
      this.logger.error('Signature verification failed:', error);
      return false;
    }
  }

  async getCertificateInfo(certificateId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/certificate/${certificateId}`, {
        params: {
          username: process.env.EIMZA_USERNAME,
          password: process.env.EIMZA_PASSWORD,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Certificate info failed for ${certificateId}:`, error);
      throw error;
    }
  }

  async bulkSign(documents: Array<{ id: string; data: Buffer }>): Promise<any[]> {
    const results = [];
    for (const doc of documents) {
      try {
        const result = await this.signDocument(doc.id, doc.data);
        results.push({ documentId: doc.id, success: true, result });
      } catch (error) {
        results.push({ documentId: doc.id, success: false, error: error.message });
      }
    }
    return results;
  }
}

