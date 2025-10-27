import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

interface StripePaymentRequest {
  amount: number;
  currency: string;
  description?: string;
  customer?: {
    email: string;
    name: string;
    phone?: string;
  };
  metadata?: Record<string, string>;
  paymentMethodTypes?: string[];
  successUrl?: string;
  cancelUrl?: string;
}

@Injectable()
export class StripePaymentService {
  private readonly logger = new Logger(StripePaymentService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY') || '';
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16' as any,
    });
  }

  async createPaymentIntent(request: StripePaymentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Stripe payment intent for tenant ${tenantId}`);

      let customerId: string | undefined;

      if (request.customer) {
        const customer = await this.stripe.customers.create({
          email: request.customer.email,
          name: request.customer.name,
          phone: request.customer.phone,
          metadata: {
            tenantId,
          },
        });
        customerId = customer.id;
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        description: request.description,
        customer: customerId,
        metadata: {
          tenantId,
          ...request.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      };
    } catch (error: any) {
      this.logger.error(`Stripe payment intent creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createCheckoutSession(request: StripePaymentRequest, tenantId: string): Promise<any> {
    try {
      this.logger.log(`Creating Stripe checkout session for tenant ${tenantId}`);

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: request.paymentMethodTypes || ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: request.description || 'Payment',
              },
              unit_amount: Math.round(request.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: request.successUrl || 'https://example.com/success',
        cancel_url: request.cancelUrl || 'https://example.com/cancel',
        customer_email: request.customer?.email,
        metadata: {
          tenantId,
          ...request.metadata,
        },
      });

      return {
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url,
      };
    } catch (error: any) {
      this.logger.error(`Stripe checkout session creation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async capturePayment(paymentIntentId: string): Promise<boolean> {
    try {
      await this.stripe.paymentIntents.capture(paymentIntentId);
      return true;
    } catch (error: any) {
      this.logger.error(`Stripe payment capture failed: ${error.message}`);
      return false;
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    try {
      await this.stripe.paymentIntents.cancel(paymentIntentId);
      return true;
    } catch (error: any) {
      this.logger.error(`Stripe payment cancellation failed: ${error.message}`);
      return false;
    }
  }

  async refund(paymentIntentId: string, amount?: number): Promise<any> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error: any) {
      this.logger.error(`Stripe refund failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          created: new Date(paymentIntent.created * 1000),
        },
      };
    } catch (error: any) {
      this.logger.error(`Stripe payment intent retrieval failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async constructWebhookEvent(payload: string | Buffer, signature: string): Promise<Stripe.Event | null> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return event;
    } catch (error: any) {
      this.logger.error(`Stripe webhook verification failed: ${error.message}`);
      return null;
    }
  }

  async createCustomer(customer: {
    email: string;
    name: string;
    phone?: string;
    address?: any;
    metadata?: Record<string, string>;
  }): Promise<any> {
    try {
      const stripeCustomer = await this.stripe.customers.create({
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        metadata: customer.metadata,
      });

      return {
        success: true,
        customerId: stripeCustomer.id,
      };
    } catch (error: any) {
      this.logger.error(`Stripe customer creation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>): Promise<any> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
      });

      return {
        success: true,
        subscriptionId: subscription.id,
        status: subscription.status,
      };
    } catch (error: any) {
      this.logger.error(`Stripe subscription creation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

