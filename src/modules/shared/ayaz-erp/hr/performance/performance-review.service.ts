import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { pgTable, uuid, varchar, integer, text, timestamp, jsonb, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../../database/schema/core/tenants.schema';
import { users } from '../../../../../database/schema/core/users.schema';

export const performanceReviews = pgTable('erp_performance_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  reviewNumber: varchar('review_number', { length: 50 }).notNull().unique(),
  reviewPeriodStart: date('review_period_start').notNull(),
  reviewPeriodEnd: date('review_period_end').notNull(),
  reviewType: varchar('review_type', { length: 50 }).notNull(),
  overallRating: integer('overall_rating'),
  competencies: jsonb('competencies'),
  goals: jsonb('goals'),
  achievements: text('achievements'),
  areasForImprovement: text('areas_for_improvement'),
  comments: text('comments'),
  reviewerId: uuid('reviewer_id').references(() => users.id),
  reviewDate: date('review_date'),
  status: varchar('status', { length: 20 }).default('draft'),
  employeeSignature: text('employee_signature'),
  employeeSignedAt: timestamp('employee_signed_at'),
  nextReviewDate: date('next_review_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

interface CompetencyRating {
  competency: string;
  rating: number;
  weight: number;
  comments?: string;
}

interface GoalProgress {
  goal: string;
  target: string;
  achieved: string;
  completionPercentage: number;
  status: 'achieved' | 'in_progress' | 'not_achieved';
}

@Injectable()
export class PerformanceReviewService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createPerformanceReview(data: {
    tenantId: string;
    employeeId: string;
    reviewPeriodStart: Date;
    reviewPeriodEnd: Date;
    reviewType: string;
    competencies: CompetencyRating[];
    goals: GoalProgress[];
    achievements?: string;
    areasForImprovement?: string;
    reviewerId: string;
  }): Promise<any> {
    const overallRating = this.calculateOverallRating(data.competencies);
    const reviewNumber = `PR-${Date.now()}`;

    const nextReviewDate = new Date(data.reviewPeriodEnd);
    nextReviewDate.setMonth(nextReviewDate.getMonth() + 6);

    const [review] = await this.db.insert(performanceReviews).values({
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      reviewNumber,
      reviewPeriodStart: data.reviewPeriodStart,
      reviewPeriodEnd: data.reviewPeriodEnd,
      reviewType: data.reviewType,
      overallRating,
      competencies: data.competencies as any,
      goals: data.goals as any,
      achievements: data.achievements,
      areasForImprovement: data.areasForImprovement,
      reviewerId: data.reviewerId,
      reviewDate: new Date(),
      status: 'draft',
      nextReviewDate,
    }).returning();

    await this.eventBus.emit('performance.review.created', {
      reviewId: review.id,
      employeeId: data.employeeId,
      overallRating,
    });

    return review;
  }

  async finalizeReview(reviewId: string, comments: string): Promise<any> {
    const [updated] = await this.db
      .update(performanceReviews)
      .set({
        status: 'completed',
        comments,
        updatedAt: new Date(),
      })
      .where(eq(performanceReviews.id, reviewId))
      .returning();

    await this.eventBus.emit('performance.review.finalized', {
      reviewId,
      employeeId: updated.employeeId,
    });

    return updated;
  }

  async employeeSignReview(reviewId: string, employeeId: string, signature: string): Promise<any> {
    const [updated] = await this.db
      .update(performanceReviews)
      .set({
        employeeSignature: signature,
        employeeSignedAt: new Date(),
      })
      .where(
        and(
          eq(performanceReviews.id, reviewId),
          eq(performanceReviews.employeeId, employeeId),
        ),
      )
      .returning();

    return updated;
  }

  async getEmployeeReviewHistory(tenantId: string, employeeId: string): Promise<any[]> {
    return await this.db
      .select()
      .from(performanceReviews)
      .where(
        and(
          eq(performanceReviews.tenantId, tenantId),
          eq(performanceReviews.employeeId, employeeId),
        ),
      )
      .orderBy(performanceReviews.reviewDate);
  }

  async getAverageRatingByPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const reviews = await this.db
      .select()
      .from(performanceReviews)
      .where(
        and(
          eq(performanceReviews.tenantId, tenantId),
          eq(performanceReviews.status, 'completed'),
          gte(performanceReviews.reviewDate, startDate),
          lte(performanceReviews.reviewDate, endDate),
        ),
      );

    if (reviews.length === 0) return 0;

    const totalRating = reviews.reduce((sum, r) => sum + (r.overallRating || 0), 0);
    return totalRating / reviews.length;
  }

  private calculateOverallRating(competencies: CompetencyRating[]): number {
    if (!competencies || competencies.length === 0) return 0;

    const totalWeight = competencies.reduce((sum, c) => sum + c.weight, 0);
    const weightedSum = competencies.reduce((sum, c) => sum + c.rating * c.weight, 0);

    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }
}

