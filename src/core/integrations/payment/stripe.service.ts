import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private readonly enabled: boolean;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    this.enabled = !!apiKey;

    if (this.enabled) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
      this.logger.log('Stripe payment gateway configured successfully');
    } else {
      this.logger.warn('Stripe API key not found. Stripe service disabled.');
    }
  }

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<Stripe.PaymentIntent> {
    if (!this.enabled) {
      throw new Error('Stripe service not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        customer: request.customerId,
        description: request.description,
        metadata: request.metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Payment intent creation failed', error);
      throw error;
    }
  }

  async confirmPayment(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.enabled) {
      throw new Error('Stripe service not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      this.logger.log(`Payment confirmed: ${paymentIntent.id}`);
      return paymentIntent;
    } catch (error) {
      this.logger.error('Payment confirmation failed', error);
      throw error;
    }
  }

  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    if (!this.enabled) {
      throw new Error('Stripe service not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      this.logger.log(`Refund created: ${refund.id}`);
      return refund;
    } catch (error) {
      this.logger.error('Refund creation failed', error);
      throw error;
    }
  }

  async createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    if (!this.enabled) {
      throw new Error('Stripe service not configured');
    }

    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata,
      });

      this.logger.log(`Stripe customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      this.logger.error('Customer creation failed', error);
      throw error;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    if (!this.enabled) {
      throw new Error('Stripe service not configured');
    }

    return await this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async listCharges(customerId: string, limit: number = 10): Promise<Stripe.Charge[]> {
    if (!this.enabled) {
      throw new Error('Stripe service not configured');
    }

    const charges = await this.stripe.charges.list({
      customer: customerId,
      limit,
    });

    return charges.data;
  }
}

