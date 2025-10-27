import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { glAccounts, transactions, journalEntries } from '../../../../database/schema/shared/erp-finance.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createGLAccount(data: any, tenantId: string) {
    const [account] = await this.db
      .insert(glAccounts)
      .values({
        tenantId,
        ...data,
      })
      .returning();

    await this.eventBus.emit('gl_account.created', { accountId: account.id, tenantId });
    return account;
  }

  async getGLAccounts(tenantId: string, accountType?: string) {
    let query = this.db.select().from(glAccounts).where(eq(glAccounts.tenantId, tenantId));

    if (accountType) {
      query = query.where(and(eq(glAccounts.tenantId, tenantId), eq(glAccounts.accountType, accountType)));
    }

    return await query;
  }

  async createTransaction(data: any, tenantId: string, userId: string) {
    const [transaction] = await this.db
      .insert(transactions)
      .values({
        tenantId,
        createdBy: userId,
        ...data,
      })
      .returning();

    await this.updateGLBalance(transaction.transactionType, data.amount, tenantId);
    await this.eventBus.emit('transaction.created', { transactionId: transaction.id, tenantId });
    
    return transaction;
  }

  async getTransactions(tenantId: string, filters?: { startDate?: Date; endDate?: Date; type?: string }) {
    let query = this.db.select().from(transactions).where(eq(transactions.tenantId, tenantId));

    if (filters?.startDate && filters?.endDate) {
      query = query.where(
        and(
          eq(transactions.tenantId, tenantId),
          between(transactions.transactionDate, filters.startDate, filters.endDate)
        )
      );
    }

    if (filters?.type) {
      query = query.where(and(eq(transactions.tenantId, tenantId), eq(transactions.transactionType, filters.type)));
    }

    return await query;
  }

  async createJournalEntry(data: any, tenantId: string, userId: string) {
    const [entry] = await this.db
      .insert(journalEntries)
      .values({
        tenantId,
        createdBy: userId,
        ...data,
      })
      .returning();

    await this.eventBus.emit('journal_entry.created', { entryId: entry.id, tenantId });
    return entry;
  }

  async getIncomeExpenseSummary(tenantId: string, startDate: Date, endDate: Date) {
    const allTransactions = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          between(transactions.transactionDate, startDate, endDate)
        )
      );

    const income = allTransactions
      .filter((t: any) => t.transactionType === 'income')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    const expense = allTransactions
      .filter((t: any) => t.transactionType === 'expense')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

    return {
      income,
      expense,
      netProfit: income - expense,
      period: { startDate, endDate },
    };
  }

  private async updateGLBalance(transactionType: string, amount: number, tenantId: string) {
    // GL balance update logic
    return true;
  }
}

