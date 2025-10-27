import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { CarbonTrackingService } from './carbon-tracking.service';

@ApiTags('Sustainability & ESG')
@Controller({ path: 'sustainability', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SustainabilityController {
  constructor(private readonly carbonTracking: CarbonTrackingService) {}

  @Post('carbon/calculate')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Calculate carbon emissions for a route' })
  @ApiResponse({ status: 200, description: 'Carbon calculation result' })
  async calculateEmissions(@Body() data: {
    vehicleId: string;
    distance: number;
    fuelType: string;
    fuelConsumption: number;
  }) {
    const emissions = await this.carbonTracking.calculateEmissions(
      data.vehicleId,
      data.distance,
      data.fuelType,
      data.fuelConsumption,
    );

    return {
      vehicleId: data.vehicleId,
      distance: data.distance,
      co2Emissions: emissions,
      unit: 'kg',
      fuelType: data.fuelType,
    };
  }

  @Get('carbon/route/:routeId')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get carbon emissions for a specific route' })
  @ApiResponse({ status: 200, description: 'Route emissions data' })
  async getRouteEmissions(@Param('routeId') routeId: string) {
    return this.carbonTracking.getRouteEmissions(routeId);
  }

  @Get('carbon/company')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get company-wide carbon emissions' })
  @ApiResponse({ status: 200, description: 'Company emissions data' })
  async getCompanyEmissions(@Query('period') period: string = 'month') {
    return this.carbonTracking.getCompanyEmissions(period);
  }

  @Get('carbon/dashboard')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get carbon tracking dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics' })
  async getDashboard() {
    const companyData = await this.carbonTracking.getCompanyEmissions('month');
    
    return {
      summary: companyData,
      byVehicleType: {
        diesel: { emissions: 850, percentage: 68 },
        electric: { emissions: 50, percentage: 4 },
        hybrid: { emissions: 200, percentage: 16 },
        gasoline: { emissions: 150, percentage: 12 },
      },
      initiatives: [
        { name: 'Route Optimization', impact: '-15%', status: 'active' },
        { name: 'EV Fleet Expansion', impact: '-25%', status: 'in_progress' },
        { name: 'Green Warehousing', impact: '-10%', status: 'active' },
        { name: 'Carbon Offset Program', impact: 'Neutral 500kg', status: 'active' },
      ],
    };
  }
}

