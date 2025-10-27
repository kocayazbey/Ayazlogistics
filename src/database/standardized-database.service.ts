import { Injectable } from '@nestjs/common';
import { DRIZZLE_ORM } from './database.provider';

@Injectable()
export class StandardizedDatabaseService {
  constructor(private readonly drizzle: any) {}

  async executeQuery(query: string, params?: any[]) {
    return this.drizzle.execute(query, params);
  }

  async getClient() {
    return this.drizzle;
  }

  getDb() {
    return this.drizzle;
  }
}
