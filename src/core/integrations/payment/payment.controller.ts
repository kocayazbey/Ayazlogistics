import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { IyzicoService } from './iyzico.service';
import { StripeService } from './stripe.service';
import { EnhancedPaymentService, PaymentRequest } from './enhanced-payment.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Payment')
@Controller({ path: 'payment', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(
    private readonly iyzicoService: IyzicoService,
    private readonly stripeService: StripeService,
    private readonly enhancedPaymentService: EnhancedPaymentService,
  ) {}

  @Post('iyzico/initialize')
  @ApiOperation({ summary: 'Initialize Iyzico payment' })
  async initializeIyzicoPayment(
    @Body() data: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.iyzicoService.createPayment(data, data.callbackUrl);
  }

  @Get('iyzico/callback/:token')
  @ApiOperation({ summary: 'Iyzico payment callback' })
  async iyzicoCallback(@Param('token') token: string) {
    return this.iyzicoService.retrievePaymentResult(token);
  }

  @Post('stripe/payment-intent')
  @ApiOperation({ summary: 'Create Stripe payment intent' })
  async createStripePaymentIntent(@Body() data: any) {
    return this.stripeService.createPaymentIntent({
      amount: data.amount,
      currency: data.currency || 'usd',
      customerId: data.customerId,
      description: data.description,
      metadata: data.metadata,
    });
  }

  @Post('stripe/confirm/:id')
  @ApiOperation({ summary: 'Confirm Stripe payment' })
  async confirmStripePayment(@Param('id') paymentIntentId: string) {
    return this.stripeService.confirmPayment(paymentIntentId);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Create refund' })
  async createRefund(
    @Body() data: {
      provider: 'iyzico' | 'stripe';
      paymentId: string;
      amount?: number;
      currency?: string;
    }
  ) {
    if (data.provider === 'iyzico') {
      return this.iyzicoService.createRefund(data.paymentId, data.amount, data.currency);
    } else {
      return this.stripeService.createRefund(data.paymentId, data.amount);
    }
  }

  @Post('process')
  @ApiOperation({ summary: 'Process payment with fraud detection and caching' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid payment request' })
  @ApiResponse({ status: 402, description: 'Payment failed' })
  @ApiResponse({ status: 403, description: 'Payment blocked due to fraud' })
  async processPayment(
    @Body() paymentRequest: PaymentRequest,
    @CurrentUser('id') userId: string,
  ) {
    try {
      // Add user ID to request
      paymentRequest.customer.id = userId;

      const result = await this.enhancedPaymentService.processPayment(paymentRequest);

      return {
        success: true,
        paymentId: result.id,
        status: result.status,
        fraudScore: result.fraudScore,
        riskLevel: result.riskLevel,
        provider: result.provider,
        timestamp: result.createdAt,
      };
    } catch (error) {
      if (error.message.includes('fraud')) {
        throw new HttpException(
          {
            success: false,
            error: 'Payment blocked',
            message: 'Transaction blocked due to security concerns',
            code: 'PAYMENT_BLOCKED',
          },
          HttpStatus.FORBIDDEN,
        );
      }

      if (error.message.includes('duplicate')) {
        throw new HttpException(
          {
            success: false,
            error: 'Duplicate payment',
            message: 'Duplicate payment detected',
            code: 'DUPLICATE_PAYMENT',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        {
          success: false,
          error: 'Payment failed',
          message: error.message,
          code: 'PAYMENT_FAILED',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  @Get('status/:paymentId')
  @ApiOperation({ summary: 'Get payment status with caching' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    try {
      const paymentStatus = await this.enhancedPaymentService.getPaymentStatus(paymentId);

      if (!paymentStatus) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        paymentId: paymentStatus.id,
        orderId: paymentStatus.orderId,
        status: paymentStatus.status,
        amount: paymentStatus.amount,
        currency: paymentStatus.currency,
        fraudScore: paymentStatus.fraudScore,
        riskLevel: paymentStatus.riskLevel,
        createdAt: paymentStatus.createdAt,
        updatedAt: paymentStatus.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve payment status',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('confirm/:paymentId')
  @ApiOperation({ summary: 'Confirm payment from provider callback' })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  async confirmPayment(@Param('paymentId') paymentId: string) {
    try {
      const result = await this.enhancedPaymentService.confirmPayment(paymentId);

      return {
        success: true,
        paymentId: result.id,
        status: result.status,
        confirmedAt: result.updatedAt,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Payment confirmation failed',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':paymentId/refund')
  @ApiOperation({ summary: 'Refund payment with enhanced tracking' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() refundData: { amount?: number; reason?: string },
  ) {
    try {
      const result = await this.enhancedPaymentService.refundPayment(
        paymentId,
        refundData.amount,
        refundData.reason,
      );

      return {
        success: true,
        refundId: result.id || result.refundId,
        amount: result.amount || refundData.amount,
        status: 'refunded',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Refund failed',
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payment history for current user' })
  async getPaymentHistory(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @CurrentUser('id') userId: string,
  ) {
    try {
      const paymentHistory = await this.enhancedPaymentService.getPaymentHistory(
        userId,
        parseInt(limit),
        parseInt(offset),
      );

      return {
        success: true,
        payments: paymentHistory.map(payment => ({
          id: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          fraudScore: payment.fraudScore,
          riskLevel: payment.riskLevel,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        })),
        total: paymentHistory.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve payment history',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get payment system metrics (admin only)' })
  async getPaymentMetrics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser('role') userRole: string,
  ) {
    // Check if user has admin access
    if (userRole !== 'admin') {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
      }

      const metrics = await this.enhancedPaymentService.getPaymentMetrics(start, end);

      return {
        success: true,
        metrics,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          error: 'Failed to retrieve payment metrics',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

