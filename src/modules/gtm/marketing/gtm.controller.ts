import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { GTMService } from './gtm.service';
import { CreateVerticalDemoDto } from './dto/create-vertical-demo.dto';
import { CreateROICalculatorDto } from './dto/create-roi-calculator.dto';
import { CreateReferenceCustomerDto } from './dto/create-reference-customer.dto';
import { CalculateROIDto } from './dto/calculate-roi.dto';

@ApiTags('GTM (Go-to-Market)')
@Controller({ path: 'gtm', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GTMController {
  constructor(private readonly gtmService: GTMService) {}

  @Get('dashboard')
  @Roles('admin', 'gtm_manager', 'viewer')
  @ApiOperation({ summary: 'Get GTM dashboard' })
  @ApiResponse({ status: 200, description: 'GTM dashboard retrieved successfully' })
  async getGTMDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.gtmService.getGTMDashboard(tenantId);
  }

  @Post('vertical-demos')
  @Roles('admin', 'gtm_manager')
  @ApiOperation({ summary: 'Create vertical demo' })
  @ApiResponse({ status: 201, description: 'Vertical demo created successfully' })
  async createVerticalDemo(
    @Body() createVerticalDemoDto: CreateVerticalDemoDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.gtmService.createVerticalDemo({ ...createVerticalDemoDto, tenantId });
  }

  @Get('vertical-demos')
  @Roles('admin', 'gtm_manager', 'viewer')
  @ApiOperation({ summary: 'Get vertical demos' })
  @ApiResponse({ status: 200, description: 'Vertical demos retrieved successfully' })
  async getVerticalDemos(@CurrentUser('tenantId') tenantId: string) {
    return this.gtmService.getVerticalDemos(tenantId);
  }

  @Post('roi-calculators')
  @Roles('admin', 'gtm_manager')
  @ApiOperation({ summary: 'Create ROI calculator' })
  @ApiResponse({ status: 201, description: 'ROI calculator created successfully' })
  async createROICalculator(
    @Body() createROICalculatorDto: CreateROICalculatorDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.gtmService.createROICalculator({ ...createROICalculatorDto, tenantId });
  }

  @Post('roi-calculators/:id/calculate')
  @Roles('admin', 'gtm_manager', 'viewer')
  @ApiOperation({ summary: 'Calculate ROI' })
  @ApiResponse({ status: 200, description: 'ROI calculated successfully' })
  async calculateROI(
    @Param('id') id: string,
    @Body() calculateROIDto: CalculateROIDto
  ) {
    return this.gtmService.calculateROI(id, calculateROIDto.inputs);
  }

  @Post('reference-customers')
  @Roles('admin', 'gtm_manager')
  @ApiOperation({ summary: 'Create reference customer' })
  @ApiResponse({ status: 201, description: 'Reference customer created successfully' })
  async createReferenceCustomer(
    @Body() createReferenceCustomerDto: CreateReferenceCustomerDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.gtmService.createReferenceCustomer({ ...createReferenceCustomerDto, tenantId });
  }

  @Get('reference-customers')
  @Roles('admin', 'gtm_manager', 'viewer')
  @ApiOperation({ summary: 'Get reference customers' })
  @ApiResponse({ status: 200, description: 'Reference customers retrieved successfully' })
  async getReferenceCustomers(@CurrentUser('tenantId') tenantId: string) {
    return this.gtmService.getReferenceCustomers(tenantId);
  }
}
