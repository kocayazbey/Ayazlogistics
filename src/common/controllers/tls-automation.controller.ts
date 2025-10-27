import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TlsAutomationService } from '../services/tls-automation.service';

@ApiTags('TLS Automation')
@Controller('tls-automation')
export class TlsAutomationController {
  constructor(private readonly tlsAutomationService: TlsAutomationService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Setup cert-manager for TLS automation' })
  @ApiResponse({ status: 200, description: 'TLS automation setup completed successfully' })
  async setupCertManager() {
    await this.tlsAutomationService.setupCertManager();
    return { status: 'TLS automation setup completed successfully' };
  }

  @Post('request-certificate')
  @ApiOperation({ summary: 'Request TLS certificate' })
  @ApiResponse({ status: 201, description: 'Certificate request submitted successfully' })
  async requestCertificate(@Body() body: { domain: string; email: string }) {
    const certificateId = await this.tlsAutomationService.requestCertificate(body.domain, body.email);
    return { certificateId, status: 'Certificate request submitted successfully' };
  }

  @Post('renew-certificate')
  @ApiOperation({ summary: 'Renew TLS certificate' })
  @ApiResponse({ status: 200, description: 'Certificate renewal initiated successfully' })
  async renewCertificate(@Body() body: { certificateId: string }) {
    await this.tlsAutomationService.renewCertificate(body.certificateId);
    return { status: 'Certificate renewal initiated successfully' };
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Get all certificates' })
  @ApiResponse({ status: 200, description: 'Certificates retrieved successfully' })
  async getAllCertificates() {
    return await this.tlsAutomationService.getAllCertificates();
  }

  @Get('certificates/expiring')
  @ApiOperation({ summary: 'Get expiring certificates' })
  @ApiResponse({ status: 200, description: 'Expiring certificates retrieved successfully' })
  async getExpiringCertificates() {
    return await this.tlsAutomationService.getExpiringCertificates();
  }

  @Get('certificates/:certificateId/status')
  @ApiOperation({ summary: 'Get certificate status' })
  @ApiResponse({ status: 200, description: 'Certificate status retrieved successfully' })
  async getCertificateStatus(@Param('certificateId') certificateId: string) {
    return await this.tlsAutomationService.checkCertificateStatus(certificateId);
  }

  @Post('auto-renewal')
  @ApiOperation({ summary: 'Setup automatic certificate renewal' })
  @ApiResponse({ status: 200, description: 'Auto-renewal setup completed successfully' })
  async setupAutoRenewal() {
    await this.tlsAutomationService.setupAutoRenewal();
    return { status: 'Auto-renewal setup completed successfully' };
  }
}