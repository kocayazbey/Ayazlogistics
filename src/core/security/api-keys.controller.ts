import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';

@Controller('api/v1/apikeys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post('create')
  async create(@Body() body: { label?: string; tenantId?: string; ttlDays?: number }) {
    return this.apiKeys.createKey(body.label, body.tenantId, body.ttlDays);
  }

  @Post(':id/rotate')
  async rotate(@Param('id') id: string) {
    return this.apiKeys.rotateKey(id);
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string) {
    await this.apiKeys.revokeKey(id);
    return { success: true };
  }

  @Post('expire-check')
  async expireCheck() {
    const count = await this.apiKeys.expireKeys();
    return { expired: count };
  }
}
