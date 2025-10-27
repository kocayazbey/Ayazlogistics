import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OpenApiTypesService } from '../services/openapi-types.service';

@ApiTags('OpenAPI TypeScript Types')
@Controller('openapi-types')
export class OpenApiTypesController {
  constructor(private readonly openApiTypesService: OpenApiTypesService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate TypeScript types from OpenAPI spec' })
  @ApiResponse({ status: 200, description: 'TypeScript types generated successfully' })
  async generateTypes(@Body() body: { openApiUrl: string }) {
    const types = await this.openApiTypesService.generateTypesFromOpenApi(body.openApiUrl);
    return { types };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate generated TypeScript types' })
  @ApiResponse({ status: 200, description: 'Type validation completed' })
  async validateTypes(@Body() body: { types: string }) {
    const isValid = await this.openApiTypesService.validateTypes(body.types);
    return { valid: isValid };
  }

  @Post('client')
  @ApiOperation({ summary: 'Generate API client from types' })
  @ApiResponse({ status: 200, description: 'API client generated successfully' })
  async generateApiClient(@Body() body: { types: string }) {
    const client = await this.openApiTypesService.generateApiClient(body.types);
    return { client };
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all generated types' })
  @ApiResponse({ status: 200, description: 'Generated types retrieved successfully' })
  getAllTypes() {
    return this.openApiTypesService.getGeneratedTypes();
  }

  @Get('types/:typeId')
  @ApiOperation({ summary: 'Get specific generated types' })
  @ApiResponse({ status: 200, description: 'Generated types retrieved successfully' })
  getTypes(@Param('typeId') typeId: string) {
    return this.openApiTypesService.getGeneratedTypes(typeId);
  }
}