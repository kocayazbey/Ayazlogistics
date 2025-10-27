import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { LoadBoardService } from '../../ayaz-tms/load-matching/load-board.service';
import { LoadPlanningService } from '../../ayaz-tms/load-planning/load-planning.service';

@ApiTags('TMS Load Board')
@Controller({ path: 'tms/load-board', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TMSLoadBoardController {
  constructor(
    private readonly loadBoard: LoadBoardService,
    private readonly loadPlanning: LoadPlanningService,
  ) {}

  @Post('loads')
  @ApiOperation({ summary: 'Post a new load to the load board' })
  @ApiResponse({ status: 201, description: 'Load posted successfully' })
  async postLoad(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const load = await this.loadBoard.postLoad({
      ...data,
      customerId: data.customerId || userId,
    });

    return {
      success: true,
      message: 'Load posted to board successfully',
      load,
    };
  }

  @Get('loads')
  @ApiOperation({ summary: 'Get available loads from load board' })
  @ApiResponse({ status: 200, description: 'Returns list of available loads' })
  async getAvailableLoads(
    @Query() query: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    // Simulated available loads
    const loads = [
      {
        id: 'LOAD-001',
        customerId: 'cust-1',
        customerName: 'ABC Logistics',
        origin: 'Istanbul',
        originCity: 'Istanbul',
        originState: 'Istanbul',
        destination: 'Ankara',
        destinationCity: 'Ankara',
        destinationState: 'Ankara',
        pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        weight: 15000,
        volume: 40,
        loadType: 'ftl',
        rate: 4500,
        equipment: 'dry_van',
        distance: 450,
        status: 'available',
        postedAt: new Date(),
      },
      {
        id: 'LOAD-002',
        customerId: 'cust-2',
        customerName: 'XYZ Transport',
        origin: 'Izmir',
        originCity: 'Izmir',
        originState: 'Izmir',
        destination: 'Bursa',
        destinationCity: 'Bursa',
        destinationState: 'Bursa',
        pickupDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        weight: 8000,
        volume: 25,
        loadType: 'ltl',
        rate: 2800,
        equipment: 'dry_van',
        distance: 280,
        status: 'available',
        postedAt: new Date(),
      },
      {
        id: 'LOAD-003',
        customerId: 'cust-3',
        customerName: 'Global Freight',
        origin: 'Antalya',
        originCity: 'Antalya',
        originState: 'Antalya',
        destination: 'Istanbul',
        destinationCity: 'Istanbul',
        destinationState: 'Istanbul',
        pickupDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        weight: 20000,
        volume: 50,
        loadType: 'ftl',
        rate: 5200,
        equipment: 'refrigerated',
        distance: 550,
        status: 'available',
        postedAt: new Date(),
      },
    ];

    // Apply filters
    let filtered = loads;
    
    if (query.origin) {
      filtered = filtered.filter((l) => 
        l.origin.toLowerCase().includes(query.origin.toLowerCase())
      );
    }
    
    if (query.destination) {
      filtered = filtered.filter((l) => 
        l.destination.toLowerCase().includes(query.destination.toLowerCase())
      );
    }
    
    if (query.loadType) {
      filtered = filtered.filter((l) => l.loadType === query.loadType);
    }
    
    if (query.equipment) {
      filtered = filtered.filter((l) => l.equipment === query.equipment);
    }

    return {
      loads: filtered,
      total: filtered.length,
      filters: {
        origin: query.origin,
        destination: query.destination,
        loadType: query.loadType,
        equipment: query.equipment,
      },
    };
  }

  @Get('loads/:loadId')
  @ApiOperation({ summary: 'Get load details' })
  @ApiResponse({ status: 200, description: 'Returns load details' })
  async getLoadDetails(@Param('loadId') loadId: string) {
    return {
      id: loadId,
      customerId: 'cust-1',
      customerName: 'ABC Logistics',
      customerRating: 4.7,
      customerTotalLoads: 245,
      origin: 'Istanbul',
      originAddress: 'Atatürk Bulvarı No:123, Şişli',
      originCoordinates: { lat: 41.0082, lng: 28.9784 },
      destination: 'Ankara',
      destinationAddress: 'Kızılay Meydanı No:45, Çankaya',
      destinationCoordinates: { lat: 39.9334, lng: 32.8597 },
      pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      pickupTimeWindow: { start: '08:00', end: '12:00' },
      deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      deliveryTimeWindow: { start: '09:00', end: '17:00' },
      weight: 15000,
      volume: 40,
      loadType: 'ftl',
      rate: 4500,
      paymentTerms: 'Net 30',
      equipment: 'dry_van',
      distance: 450,
      estimatedDuration: 6,
      commodity: 'General Freight',
      specialRequirements: ['Team Driver Preferred', 'Tracking Required'],
      insurance: 50000,
      status: 'available',
      postedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      bids: 3,
    };
  }

  @Post('loads/:loadId/bid')
  @ApiOperation({ summary: 'Place a bid on a load' })
  @ApiResponse({ status: 201, description: 'Bid placed successfully' })
  async placeBid(
    @Param('loadId') loadId: string,
    @Body() data: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return {
      success: true,
      message: 'Bid placed successfully',
      bid: {
        id: `BID-${Date.now()}`,
        loadId,
        carrierId: userId,
        bidAmount: data.bidAmount,
        proposedPickupDate: data.proposedPickupDate,
        proposedDeliveryDate: data.proposedDeliveryDate,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        comments: data.comments,
        status: 'pending',
        createdAt: new Date(),
      },
    };
  }

  @Get('loads/:loadId/bids')
  @ApiOperation({ summary: 'Get bids for a load' })
  @ApiResponse({ status: 200, description: 'Returns list of bids for the load' })
  async getLoadBids(@Param('loadId') loadId: string) {
    return {
      loadId,
      bids: [
        {
          id: 'BID-001',
          carrierId: 'carrier-1',
          carrierName: 'Fast Logistics',
          carrierRating: 4.8,
          bidAmount: 4200,
          originalRate: 4500,
          discount: 300,
          proposedPickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          proposedDeliveryDate: new Date(Date.now() + 3.5 * 24 * 60 * 60 * 1000),
          estimatedTransitTime: 5.5,
          vehicleType: 'dry_van',
          driverExperience: '8 years',
          insurance: 100000,
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: 'BID-002',
          carrierId: 'carrier-2',
          carrierName: 'Express Transport',
          carrierRating: 4.5,
          bidAmount: 4000,
          originalRate: 4500,
          discount: 500,
          proposedPickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          proposedDeliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          estimatedTransitTime: 6,
          vehicleType: 'dry_van',
          driverExperience: '5 years',
          insurance: 75000,
          status: 'pending',
          createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      ],
      total: 2,
    };
  }

  @Put('loads/:loadId/bids/:bidId/accept')
  @ApiOperation({ summary: 'Accept a bid' })
  @ApiResponse({ status: 200, description: 'Bid accepted successfully' })
  async acceptBid(
    @Param('loadId') loadId: string,
    @Param('bidId') bidId: string,
    @CurrentUser('id') userId: string,
  ) {
    return {
      success: true,
      message: 'Bid accepted successfully',
      loadId,
      bidId,
      status: 'assigned',
      assignedAt: new Date(),
    };
  }

  @Post('match')
  @ApiOperation({ summary: 'Match loads with available capacity' })
  @ApiResponse({ status: 200, description: 'Returns load matches' })
  async matchLoads(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const matches = await this.loadBoard.matchLoadsWithCapacity(
      data.loads,
      data.capacity
    );

    return {
      success: true,
      matches,
      totalMatches: matches.length,
      unmatchedLoads: data.loads.length - matches.length,
    };
  }

  @Post('optimize-matching')
  @ApiOperation({ summary: 'Optimize load matching for maximum efficiency' })
  @ApiResponse({ status: 200, description: 'Returns optimized load matching recommendations' })
  async optimizeMatching(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const optimization = await this.loadBoard.optimizeLoadMatching(
      data.loads,
      data.capacity
    );

    return {
      success: true,
      optimization,
    };
  }

  @Get('backhaul/:vehicleId')
  @ApiOperation({ summary: 'Find backhaul opportunities for a vehicle' })
  @ApiResponse({ status: 200, description: 'Returns backhaul opportunities' })
  async findBackhaul(
    @Param('vehicleId') vehicleId: string,
    @Query('deliveryLocation') deliveryLocation: string,
    @Query('homeBase') homeBase: string,
  ) {
    const opportunities = await this.loadBoard.getBackhaulOpportunities(
      vehicleId,
      deliveryLocation,
      homeBase
    );

    return {
      vehicleId,
      deliveryLocation,
      homeBase,
      opportunities,
      totalOpportunities: opportunities.length,
      potentialRevenue: opportunities.reduce((sum, opp) => sum + opp.rate, 0),
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get load board analytics' })
  @ApiResponse({ status: 200, description: 'Returns load board performance metrics' })
  async getAnalytics(@Query() query: any) {
    return {
      period: {
        startDate: query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: query.endDate || new Date(),
      },
      metrics: {
        totalLoadsPosted: 485,
        loadsMatched: 421,
        matchRate: 86.8,
        avgBidsPerLoad: 3.2,
        avgTimeToMatch: 4.5, // hours
        avgDiscount: 8.5, // percentage
        totalRevenue: 2145000,
        savedMiles: 15400,
        emptyMiles: 5200,
        backhaulUtilization: 65.2,
      },
      topLanes: [
        { origin: 'Istanbul', destination: 'Ankara', loads: 125, avgRate: 4200 },
        { origin: 'Izmir', destination: 'Istanbul', loads: 95, avgRate: 3800 },
        { origin: 'Ankara', destination: 'Izmir', loads: 78, avgRate: 3600 },
      ],
      equipmentDemand: [
        { equipment: 'dry_van', percentage: 65 },
        { equipment: 'flatbed', percentage: 20 },
        { equipment: 'refrigerated', percentage: 15 },
      ],
    };
  }

  @Delete('loads/:loadId')
  @ApiOperation({ summary: 'Remove a load from the board' })
  @ApiResponse({ status: 200, description: 'Load removed successfully' })
  async removeLoad(
    @Param('loadId') loadId: string,
    @CurrentUser('id') userId: string,
  ) {
    return {
      success: true,
      message: 'Load removed from board',
      loadId,
    };
  }
}

