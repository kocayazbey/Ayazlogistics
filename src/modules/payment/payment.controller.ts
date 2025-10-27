import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { ThreeDSecureService } from './three-d-secure.service';
import { PaymentProcessorService } from './payment-processor.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly threeDSecureService: ThreeDSecureService,
    private readonly paymentProcessor: PaymentProcessorService,
  ) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment with 3D Secure' })
  @ApiResponse({ status: 200, description: 'Payment initiated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiatePayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    return this.paymentService.initiatePayment(createPaymentDto, userId, tenantId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment after 3D Secure' })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification data' })
  async verifyPayment(
    @Body() verifyPaymentDto: VerifyPaymentDto,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return this.paymentService.verifyPayment(verifyPaymentDto, userId);
  }

  @Get('status/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async getPaymentStatus(
    @Param('paymentId') paymentId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return this.paymentService.getPaymentStatus(paymentId, userId);
  }

  @Post('refund/:paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process payment refund' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundData: { amount?: number; reason: string },
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return this.paymentService.refundPayment(paymentId, refundData, userId);
  }

  @Get('methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods retrieved successfully' })
  async getPaymentMethods() {
    return this.paymentService.getPaymentMethods();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getPaymentHistory(
    @Query() query: { page?: number; limit?: number; status?: string },
    @Request() req: any,
  ) {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    return this.paymentService.getPaymentHistory(
      userId,
      tenantId,
      query.page || 1,
      query.limit || 20,
      query.status
    );
  }
}
