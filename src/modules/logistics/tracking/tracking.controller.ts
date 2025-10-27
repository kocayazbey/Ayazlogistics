import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { Public } from '../../../core/auth/decorators/public.decorator';

@ApiTags('Tracking')
@Controller({ path: 'tracking', version: '1' })
export class TrackingController {
  @Get('shipment/:trackingNumber')
  @Public()
  @ApiOperation({ summary: 'Track shipment by tracking number' })
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return { message: 'Shipment tracking', trackingNumber };
  }

  @Get('vehicle/:vehicleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Track vehicle' })
  async trackVehicle(@Param('vehicleId') vehicleId: string) {
    return { message: 'Vehicle tracking', vehicleId };
  }

  @Post('geofence')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create geofence' })
  async createGeofence(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return { message: 'Geofence created' };
  }
}

