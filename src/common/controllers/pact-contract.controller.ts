import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PactContractService } from '../services/pact-contract.service';

@ApiTags('Pact Contract Testing')
@Controller('pact')
export class PactContractController {
  constructor(private readonly pactContractService: PactContractService) {}

  @Post('contract')
  @ApiOperation({ summary: 'Create Pact contract' })
  @ApiResponse({ status: 201, description: 'Pact contract created successfully' })
  async createContract(@Body() body: { consumer: string; provider: string; interactions: any[] }) {
    const contractId = await this.pactContractService.createContract(body.consumer, body.provider, body.interactions);
    return { contractId, status: 'Contract created successfully' };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Pact contract' })
  @ApiResponse({ status: 200, description: 'Contract verification completed' })
  async verifyContract(@Body() body: { contractId: string }) {
    const isValid = await this.pactContractService.verifyContract(body.contractId);
    return { valid: isValid, contractId: body.contractId };
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish Pact contract' })
  @ApiResponse({ status: 200, description: 'Contract published successfully' })
  async publishContract(@Body() body: { contractId: string }) {
    await this.pactContractService.publishContract(body.contractId);
    return { status: 'Contract published successfully' };
  }

  @Get('contracts')
  @ApiOperation({ summary: 'Get all contracts' })
  @ApiResponse({ status: 200, description: 'Contracts retrieved successfully' })
  getAllContracts() {
    return this.pactContractService.getAllContracts();
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get specific contract' })
  @ApiResponse({ status: 200, description: 'Contract retrieved successfully' })
  getContract(@Param('contractId') contractId: string) {
    return this.pactContractService.getContract(contractId);
  }

  @Post('test')
  @ApiOperation({ summary: 'Run contract tests' })
  @ApiResponse({ status: 200, description: 'Contract tests completed' })
  async runContractTests(@Body() body: { consumer: string; provider: string }) {
    return await this.pactContractService.runContractTests(body.consumer, body.provider);
  }
}