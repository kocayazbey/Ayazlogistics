import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto, LocationQueryDto } from './dto/location.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles('admin', 'logistics_manager')
  async create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  @Get()
  @Roles('admin', 'logistics_manager', 'dispatcher', 'driver')
  async findAll(@Query() query: LocationQueryDto) {
    return this.locationsService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'logistics_manager', 'dispatcher', 'driver')
  async findOne(@Param('id') id: string) {
    return this.locationsService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'logistics_manager')
  async update(@Param('id') id: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationsService.update(id, updateLocationDto);
  }

  @Delete(':id')
  @Roles('admin', 'logistics_manager')
  async remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }

  @Get('search/nearby')
  @Roles('admin', 'logistics_manager', 'dispatcher', 'driver')
  async findNearby(@Query('lat') lat: number, @Query('lng') lng: number, @Query('radius') radius: number = 10) {
    return this.locationsService.findNearby(lat, lng, radius);
  }

  @Get('search/address')
  @Roles('admin', 'logistics_manager', 'dispatcher', 'driver')
  async searchByAddress(@Query('address') address: string) {
    return this.locationsService.searchByAddress(address);
  }
}
