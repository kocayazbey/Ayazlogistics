import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MtlsHttpService {
  private client: AxiosInstance;

  constructor() {
    const cert = process.env.MTLS_CERT_PATH ? require('fs').readFileSync(process.env.MTLS_CERT_PATH) : undefined;
    const key = process.env.MTLS_KEY_PATH ? require('fs').readFileSync(process.env.MTLS_KEY_PATH) : undefined;
    const ca = process.env.MTLS_CA_PATH ? require('fs').readFileSync(process.env.MTLS_CA_PATH) : undefined;

    const agent = new https.Agent({ cert, key, ca, rejectUnauthorized: process.env.MTLS_REJECT_UNAUTHORIZED !== 'false' });
    this.client = axios.create({ httpsAgent: agent });
  }

  getClient(): AxiosInstance { return this.client; }
}
