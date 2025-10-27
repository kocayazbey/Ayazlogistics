import { Controller, Post, Get, Body, Param, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GIBEFaturaService } from './gib-e-fatura.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('E-Invoice')
@Controller({ path: 'e-invoice', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EInvoiceController {
  constructor(private readonly gibService: GIBEFaturaService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create e-invoice' })
  async createEInvoice(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.gibService.createEInvoice(data);
  }

  @Post(':uuid/cancel')
  @ApiOperation({ summary: 'Cancel e-invoice' })
  async cancelEInvoice(
    @Param('uuid') uuid: string,
    @Body('reason') reason: string,
  ) {
    return this.gibService.cancelEInvoice(uuid, reason);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Query e-invoice status' })
  async queryEInvoice(@Param('uuid') uuid: string) {
    return this.gibService.queryEInvoice(uuid);
  }

  @Get(':uuid/html')
  @ApiOperation({ summary: 'Get e-invoice HTML' })
  async getEInvoiceHTML(@Param('uuid') uuid: string, @Res() res: Response) {
    const html = await this.gibService.getEInvoiceHTML(uuid);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get(':uuid/pdf')
  @ApiOperation({ summary: 'Get e-invoice PDF' })
  async getEInvoicePDF(@Param('uuid') uuid: string, @Res() res: Response) {
    const pdf = await this.gibService.getEInvoicePDF(uuid);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="e-invoice-${uuid}.pdf"`);
    res.send(pdf);
  }
}

