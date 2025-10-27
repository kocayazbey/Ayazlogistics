import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LighthouseCiService } from '../services/lighthouse-ci.service';

@ApiTags('Lighthouse CI')
@Controller('lighthouse')
export class LighthouseCiController {
  constructor(private readonly lighthouseCiService: LighthouseCiService) {}

  @Post('audit')
  @ApiOperation({ summary: 'Run Lighthouse audit' })
  @ApiResponse({ status: 200, description: 'Lighthouse audit completed' })
  async runAudit(@Body() body: { url: string }) {
    return await this.lighthouseCiService.runLighthouseAudit(body.url);
  }

  @Post('budget')
  @ApiOperation({ summary: 'Set Lighthouse budget' })
  @ApiResponse({ status: 201, description: 'Lighthouse budget set successfully' })
  setBudget(@Body() body: { metric: string; budget: number }) {
    this.lighthouseCiService.setBudget(body.metric, body.budget);
    return { status: 'Lighthouse budget set successfully' };
  }

  @Get('budgets')
  @ApiOperation({ summary: 'Get all Lighthouse budgets' })
  @ApiResponse({ status: 200, description: 'Lighthouse budgets retrieved successfully' })
  getAllBudgets() {
    return Array.from(this.lighthouseCiService.getAllBudgets().entries()).map(([metric, budget]) => ({
      metric,
      budget
    }));
  }
}