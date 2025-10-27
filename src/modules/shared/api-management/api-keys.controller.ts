import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyQueryDto } from './dto/api-key.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';

@Controller('api-management/keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles('admin', 'api_manager')
  async create(@Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiKeysService.create(createApiKeyDto);
  }

  @Get()
  @Roles('admin', 'api_manager')
  async findAll(@Query() query: ApiKeyQueryDto) {
    return this.apiKeysService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'api_manager')
  async findOne(@Param('id') id: string) {
    return this.apiKeysService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'api_manager')
  async update(@Param('id') id: string, @Body() updateApiKeyDto: UpdateApiKeyDto) {
    return this.apiKeysService.update(id, updateApiKeyDto);
  }

  @Delete(':id')
  @Roles('admin', 'api_manager')
  async remove(@Param('id') id: string) {
    return this.apiKeysService.remove(id);
  }

  @Post(':id/regenerate')
  @Roles('admin', 'api_manager')
  async regenerate(@Param('id') id: string) {
    return this.apiKeysService.regenerate(id);
  }

  @Post(':id/revoke')
  @Roles('admin', 'api_manager')
  async revoke(@Param('id') id: string) {
    return this.apiKeysService.revoke(id);
  }

  @Get(':id/usage')
  @Roles('admin', 'api_manager')
  async getUsage(@Param('id') id: string, @Query('period') period: string = '30d') {
    return this.apiKeysService.getUsage(id, period);
  }

  @Get('rate-limits')
  @Roles('admin', 'api_manager')
  async getRateLimits() {
    return this.apiKeysService.getRateLimits();
  }
}
