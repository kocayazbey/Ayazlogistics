import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsageTrackerService } from '../../ayaz-billing/usage-based-billing/usage-tracker.service';
import { UsageBillingService } from '../../ayaz-billing/usage-based-billing/usage-billing.service';

@Controller('api/billing/usage')
export class UsageBasedBillingController {
  constructor(
    private readonly usageTracker: UsageTrackerService,
    private readonly usageBilling: UsageBillingService,
  ) {}

  @Post('record')
  async recordUsage(@Body() data: any) {
    return await this.usageTracker.recordUsage(data);
  }

  @Post('bulk')
  async bulkRecordUsage(@Body() data: { records: any[] }) {
    return await this.usageTracker.bulkRecordUsage(data.records);
  }

  @Get(':contractId')
  async getUsageByContract(
    @Param('contractId') contractId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.usageTracker.getUsageByPeriod(
      contractId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':contractId/stats')
  async getUsageStats(
    @Param('contractId') contractId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.usageTracker.getUsageStats(
      contractId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get(':contractId/aggregated')
  async getAggregatedUsage(
    @Param('contractId') contractId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.usageTracker.getAggregatedUsageByPeriod(
      contractId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Post('generate-invoice')
  async generateInvoice(@Body() data: any) {
    return await this.usageBilling.generateInvoice(data);
  }
}

