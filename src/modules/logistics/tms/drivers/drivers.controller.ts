import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto, DriverQueryDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';

@Controller('tms/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @Roles('admin', 'tms_manager')
  async create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  @Roles('admin', 'tms_manager', 'dispatcher')
  async findAll(@Query() query: DriverQueryDto) {
    return this.driversService.findAll(query);
  }

  @Get(':id')
  @Roles('admin', 'tms_manager', 'dispatcher')
  async findOne(@Param('id') id: string) {
    return this.driversService.findOne(id);
  }

  @Put(':id')
  @Roles('admin', 'tms_manager')
  async update(@Param('id') id: string, @Body() updateDriverDto: UpdateDriverDto) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Delete(':id')
  @Roles('admin', 'tms_manager')
  async remove(@Param('id') id: string) {
    return this.driversService.remove(id);
  }

  @Post(':id/assign-vehicle')
  @Roles('admin', 'tms_manager')
  async assignVehicle(@Param('id') id: string, @Body('vehicleId') vehicleId: string) {
    return this.driversService.assignVehicle(id, vehicleId);
  }

  @Post(':id/performance')
  @Roles('admin', 'tms_manager')
  async updatePerformance(@Param('id') id: string, @Body() performanceData: any) {
    return this.driversService.updatePerformance(id, performanceData);
  }

  @Get(':id/assignments')
  @Roles('admin', 'tms_manager', 'dispatcher')
  async getAssignments(@Param('id') id: string) {
    return this.driversService.getAssignments(id);
  }
}
