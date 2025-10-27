import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../core/events/event-bus.service';

interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'basic' | 'pro' | 'enterprise';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    users: number;
    warehouses: number;
    shipments: number;
    storage: number;
  };
}

interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  meteredUsage: {
    shipments: number;
    apiCalls: number;
    storage: number;
  };
}

@Injectable()
export class SubscriptionService {
  private plans: SubscriptionPlan[] = [
    {
      id: 'plan-basic',
      name: 'Basic',
      tier: 'basic',
      price: 2500,
      currency: 'TRY',
      billingCycle: 'monthly',
      features: ['Up to 5 users', '1 warehouse', '500 shipments/month'],
      limits: { users: 5, warehouses: 1, shipments: 500, storage: 10 },
    },
    {
      id: 'plan-pro',
      name: 'Professional',
      tier: 'pro',
      price: 7500,
      currency: 'TRY',
      billingCycle: 'monthly',
      features: ['Up to 25 users', '5 warehouses', '5000 shipments/month', 'Advanced analytics'],
      limits: { users: 25, warehouses: 5, shipments: 5000, storage: 100 },
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      tier: 'enterprise',
      price: 25000,
      currency: 'TRY',
      billingCycle: 'monthly',
      features: ['Unlimited users', 'Unlimited warehouses', 'Unlimited shipments', 'Full features'],
      limits: { users: -1, warehouses: -1, shipments: -1, storage: -1 },
    },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createSubscription(customerId: string, planId: string, trialDays: number = 14): Promise<Subscription> {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) throw new Error('Plan not found');

    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

    const subscription: Subscription = {
      id: `sub-${Date.now()}`,
      customerId,
      planId,
      status: 'trial',
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      trialEnd,
      cancelAtPeriodEnd: false,
      meteredUsage: { shipments: 0, apiCalls: 0, storage: 0 },
    };

    await this.eventBus.publish('subscription.created', { subscriptionId: subscription.id, customerId, planId });
    return subscription;
  }

  async upgradeSubscription(subscriptionId: string, newPlanId: string): Promise<{ subscription: Subscription; proration: number }> {
    const subscription = await this.getSubscription(subscriptionId);
    const oldPlan = this.plans.find(p => p.id === subscription.planId);
    const newPlan = this.plans.find(p => p.id === newPlanId);

    if (!oldPlan || !newPlan) throw new Error('Plan not found');

    const daysRemaining = Math.floor((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const unusedAmount = (oldPlan.price / 30) * daysRemaining;
    const newAmount = (newPlan.price / 30) * daysRemaining;
    const proration = newAmount - unusedAmount;

    subscription.planId = newPlanId;
    await this.eventBus.publish('subscription.upgraded', { subscriptionId, from: oldPlan.tier, to: newPlan.tier, proration });

    return { subscription, proration };
  }

  async recordMeteredUsage(subscriptionId: string, metric: 'shipments' | 'apiCalls' | 'storage', quantity: number): Promise<void> {
    await this.eventBus.publish('subscription.usage.recorded', { subscriptionId, metric, quantity });
  }

  async calculateInvoice(subscriptionId: string): Promise<{ baseAmount: number; meteredAmount: number; total: number }> {
    const subscription = await this.getSubscription(subscriptionId);
    const plan = this.plans.find(p => p.id === subscription.planId);

    const baseAmount = plan?.price || 0;
    const meteredAmount = this.calculateMeteredCharges(subscription, plan!);

    return { baseAmount, meteredAmount, total: baseAmount + meteredAmount };
  }

  private calculateMeteredCharges(subscription: Subscription, plan: SubscriptionPlan): number {
    let charges = 0;

    if (plan.limits.shipments > 0 && subscription.meteredUsage.shipments > plan.limits.shipments) {
      charges += (subscription.meteredUsage.shipments - plan.limits.shipments) * 5;
    }

    return charges;
  }

  private async getSubscription(id: string): Promise<Subscription> {
    return {
      id,
      customerId: 'customer-1',
      planId: 'plan-pro',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
      meteredUsage: { shipments: 150, apiCalls: 5000, storage: 25 },
    };
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.plans;
  }
}

