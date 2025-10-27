// =====================================================================================
// AYAZLOGISTICS - MULTI-CURRENCY ACCOUNTING SERVICE
// =====================================================================================
// Description: Advanced multi-currency accounting with real-time exchange rates
// Features: Currency conversion, hedging, revaluation, realized/unrealized gains/losses
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, between } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, date, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../database/schema/core/tenants.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const exchangeRates = pgTable('erp_exchange_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull(),
  targetCurrency: varchar('target_currency', { length: 3 }).notNull(),
  rate: decimal('rate', { precision: 18, scale: 8 }).notNull(),
  rateDate: date('rate_date').notNull(),
  rateType: varchar('rate_type', { length: 20 }).default('spot'),
  source: varchar('source', { length: 50 }),
  bid: decimal('bid', { precision: 18, scale: 8 }),
  ask: decimal('ask', { precision: 18, scale: 8 }),
  spread: decimal('spread', { precision: 10, scale: 6 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const currencyRevaluations = pgTable('erp_currency_revaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  revaluationNumber: varchar('revaluation_number', { length: 50 }).notNull().unique(),
  revaluationDate: date('revaluation_date').notNull(),
  baseCurrency: varchar('base_currency', { length: 3 }).notNull(),
  accountsProcessed: integer('accounts_processed').default(0),
  totalUnrealizedGain: decimal('total_unrealized_gain', { precision: 18, scale: 2 }),
  totalUnrealizedLoss: decimal('total_unrealized_loss', { precision: 18, scale: 2 }),
  netUnrealizedGL: decimal('net_unrealized_gl', { precision: 18, scale: 2 }),
  journalEntryId: uuid('journal_entry_id'),
  status: varchar('status', { length: 20 }).default('draft'),
  processedBy: uuid('processed_by'),
  processedAt: timestamp('processed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const hedgeContracts = pgTable('erp_hedge_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  contractNumber: varchar('contract_number', { length: 50 }).notNull().unique(),
  hedgeType: varchar('hedge_type', { length: 50 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  notionalAmount: decimal('notional_amount', { precision: 18, scale: 2 }).notNull(),
  strikeRate: decimal('strike_rate', { precision: 18, scale: 8 }),
  premiumPaid: decimal('premium_paid', { precision: 18, scale: 2 }),
  contractStartDate: date('contract_start_date').notNull(),
  contractEndDate: date('contract_end_date').notNull(),
  settlementDate: date('settlement_date'),
  status: varchar('status', { length: 20 }).default('active'),
  counterparty: varchar('counterparty', { length: 255 }),
  fairValue: decimal('fair_value', { precision: 18, scale: 2 }),
  realizedGL: decimal('realized_gl', { precision: 18, scale: 2 }),
  unrealizedGL: decimal('unrealized_gl', { precision: 18, scale: 2 }),
  hedgedItemReference: varchar('hedged_item_reference', { length: 255 }),
  effectivenessRatio: decimal('effectiveness_ratio', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface ExchangeRateData {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  rateDate: Date;
  rateType?: 'spot' | 'forward' | 'historical' | 'budget';
  source?: string;
  bid?: number;
  ask?: number;
}

interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  exchangeRate: number;
  conversionDate: Date;
  spread: number;
  fees: number;
  netAmount: number;
}

interface ForeignCurrencyAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  currency: string;
  foreignBalance: number;
  exchangeRate: number;
  functionalCurrencyBalance: number;
  unrealizedGL: number;
}

interface RevaluationResult {
  revaluationId: string;
  revaluationNumber: string;
  revaluationDate: Date;
  baseCurrency: string;
  accounts: Array<{
    accountId: string;
    accountCode: string;
    currency: string;
    previousRate: number;
    newRate: number;
    foreignBalance: number;
    previousFunctionalBalance: number;
    newFunctionalBalance: number;
    unrealizedGL: number;
    glType: 'gain' | 'loss';
  }>;
  summary: {
    totalAccounts: number;
    totalUnrealizedGains: number;
    totalUnrealizedLosses: number;
    netUnrealizedGL: number;
  };
  journalEntry: any;
}

interface HedgeContract {
  id?: string;
  contractNumber: string;
  hedgeType: 'forward' | 'option' | 'swap' | 'collar';
  currency: string;
  notionalAmount: number;
  strikeRate?: number;
  premiumPaid?: number;
  contractStartDate: Date;
  contractEndDate: Date;
  counterparty: string;
  hedgedItemReference?: string;
}

interface HedgeEffectivenessTest {
  hedgeContractId: string;
  testDate: Date;
  testMethod: 'dollar_offset' | 'regression' | 'var_reduction';
  hedgeGainLoss: number;
  hedgedItemGainLoss: number;
  offsetRatio: number;
  effectivenessRatio: number;
  isEffective: boolean;
  cumulative: {
    hedgeGainLoss: number;
    hedgedItemGainLoss: number;
    effectivenessRatio: number;
  };
  ineffectivePortion: number;
  conclusion: string;
}

interface CurrencyExposureAnalysis {
  baseCurrency: string;
  analysisDate: Date;
  exposureByCurrency: Array<{
    currency: string;
    exposure: {
      assets: number;
      liabilities: number;
      netExposure: number;
      hedgedAmount: number;
      unhedgedExposure: number;
    };
    atRisk: {
      valueAt1Percent: number;
      valueAt5Percent: number;
      valueAt10Percent: number;
    };
    recommendations: string[];
  }>;
  totalExposure: {
    totalAssets: number;
    totalLiabilities: number;
    totalNetExposure: number;
    hedgeCoverage: number;
  };
  riskMetrics: {
    diversificationScore: number;
    concentrationRisk: string[];
    volatilityIndex: number;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class MultiCurrencyService {
  private readonly logger = new Logger(MultiCurrencyService.name);

  // Supported currencies
  private readonly SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'TRY'];

  // Fee structure
  private readonly CONVERSION_FEES = {
    standard: 0.002, // 0.2%
    premium: 0.001, // 0.1%
    wholesale: 0.0005, // 0.05%
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // EXCHANGE RATE MANAGEMENT
  // =====================================================================================

  async updateExchangeRate(tenantId: string, rateData: ExchangeRateData): Promise<any> {
    this.logger.log(`Updating exchange rate: ${rateData.baseCurrency}/${rateData.targetCurrency} = ${rateData.rate}`);

    if (!this.SUPPORTED_CURRENCIES.includes(rateData.baseCurrency) ||
        !this.SUPPORTED_CURRENCIES.includes(rateData.targetCurrency)) {
      throw new BadRequestException('Unsupported currency');
    }

    const spread = rateData.bid && rateData.ask
      ? parseFloat(((rateData.ask - rateData.bid) / rateData.rate * 100).toFixed(4))
      : 0;

    const [rate] = await this.db.insert(exchangeRates).values({
      tenantId,
      baseCurrency: rateData.baseCurrency,
      targetCurrency: rateData.targetCurrency,
      rate: rateData.rate.toString(),
      rateDate: rateData.rateDate,
      rateType: rateData.rateType || 'spot',
      source: rateData.source || 'manual',
      bid: rateData.bid?.toString(),
      ask: rateData.ask?.toString(),
      spread: spread.toString(),
    }).returning();

    // Invalidate cache
    await this.invalidateRateCache(tenantId, rateData.baseCurrency, rateData.targetCurrency);

    await this.eventBus.emit('exchange.rate.updated', {
      baseCurrency: rateData.baseCurrency,
      targetCurrency: rateData.targetCurrency,
      rate: rateData.rate,
      rateDate: rateData.rateDate,
    });

    return rate;
  }

  async getExchangeRate(
    tenantId: string,
    baseCurrency: string,
    targetCurrency: string,
    rateDate?: Date,
    rateType: string = 'spot',
  ): Promise<number> {
    if (baseCurrency === targetCurrency) {
      return 1.0;
    }

    const cacheKey = this.cacheService.generateKey('rate', tenantId, baseCurrency, targetCurrency, rateDate?.toISOString() || 'latest', rateType);

    return this.cacheService.wrap(cacheKey, async () => {
      const effectiveDate = rateDate || new Date();

      const [rate] = await this.db
        .select()
        .from(exchangeRates)
        .where(
          and(
            eq(exchangeRates.tenantId, tenantId),
            eq(exchangeRates.baseCurrency, baseCurrency),
            eq(exchangeRates.targetCurrency, targetCurrency),
            lte(exchangeRates.rateDate, effectiveDate),
            eq(exchangeRates.rateType, rateType),
          ),
        )
        .orderBy(desc(exchangeRates.rateDate))
        .limit(1);

      if (!rate) {
        // Try inverse rate
        const [inverseRate] = await this.db
          .select()
          .from(exchangeRates)
          .where(
            and(
              eq(exchangeRates.tenantId, tenantId),
              eq(exchangeRates.baseCurrency, targetCurrency),
              eq(exchangeRates.targetCurrency, baseCurrency),
              lte(exchangeRates.rateDate, effectiveDate),
              eq(exchangeRates.rateType, rateType),
            ),
          )
          .orderBy(desc(exchangeRates.rateDate))
          .limit(1);

        if (inverseRate) {
          return 1 / parseFloat(inverseRate.rate);
        }

        throw new BadRequestException(`Exchange rate not found for ${baseCurrency}/${targetCurrency}`);
      }

      return parseFloat(rate.rate);
    }, 300); // Cache for 5 minutes
  }

  async convertCurrency(
    tenantId: string,
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    conversionDate?: Date,
    tierLevel: 'standard' | 'premium' | 'wholesale' = 'standard',
  ): Promise<CurrencyConversion> {
    this.logger.debug(`Converting ${amount} ${fromCurrency} to ${toCurrency}`);

    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        amount,
        convertedAmount: amount,
        exchangeRate: 1.0,
        conversionDate: conversionDate || new Date(),
        spread: 0,
        fees: 0,
        netAmount: amount,
      };
    }

    const effectiveDate = conversionDate || new Date();
    const exchangeRate = await this.getExchangeRate(tenantId, fromCurrency, toCurrency, effectiveDate);

    const convertedAmount = amount * exchangeRate;

    // Calculate fees
    const feeRate = this.CONVERSION_FEES[tierLevel];
    const fees = convertedAmount * feeRate;
    const spread = exchangeRate * 0.001; // 0.1% spread
    const netAmount = convertedAmount - fees;

    const conversion: CurrencyConversion = {
      fromCurrency,
      toCurrency,
      amount,
      convertedAmount,
      exchangeRate,
      conversionDate: effectiveDate,
      spread,
      fees,
      netAmount,
    };

    await this.eventBus.emit('currency.converted', {
      ...conversion,
      tierLevel,
    });

    return conversion;
  }

  async bulkUpdateExchangeRates(tenantId: string, rates: ExchangeRateData[]): Promise<{
    successful: number;
    failed: number;
    results: any[];
  }> {
    this.logger.log(`Bulk updating ${rates.length} exchange rates`);

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const rateData of rates) {
      try {
        const rate = await this.updateExchangeRate(tenantId, rateData);
        results.push({ success: true, rate });
        successful++;
      } catch (error) {
        results.push({ success: false, error: error.message, rateData });
        failed++;
      }
    }

    this.logger.log(`Bulk update completed: ${successful} successful, ${failed} failed`);

    return {
      successful,
      failed,
      results,
    };
  }

  // =====================================================================================
  // CURRENCY REVALUATION
  // =====================================================================================

  async performCurrencyRevaluation(
    tenantId: string,
    baseCurrency: string,
    revaluationDate: Date,
    processedBy: string,
  ): Promise<RevaluationResult> {
    this.logger.log(`Performing currency revaluation as of ${revaluationDate.toISOString()}`);

    // Get all foreign currency accounts with balances
    const foreignAccounts = await this.getForeignCurrencyAccounts(tenantId, baseCurrency);

    if (foreignAccounts.length === 0) {
      throw new BadRequestException('No foreign currency accounts found for revaluation');
    }

    const revaluationNumber = await this.generateRevaluationNumber(tenantId);

    const accounts = [];
    let totalUnrealizedGains = 0;
    let totalUnrealizedLosses = 0;

    for (const account of foreignAccounts) {
      // Get previous rate
      const previousRate = account.exchangeRate;

      // Get new rate as of revaluation date
      const newRate = await this.getExchangeRate(
        tenantId,
        account.currency,
        baseCurrency,
        revaluationDate,
      );

      const foreignBalance = account.foreignBalance;
      const previousFunctionalBalance = foreignBalance * previousRate;
      const newFunctionalBalance = foreignBalance * newRate;
      const unrealizedGL = newFunctionalBalance - previousFunctionalBalance;
      const glType: 'gain' | 'loss' = unrealizedGL >= 0 ? 'gain' : 'loss';

      accounts.push({
        accountId: account.accountId,
        accountCode: account.accountCode,
        currency: account.currency,
        previousRate,
        newRate,
        foreignBalance,
        previousFunctionalBalance,
        newFunctionalBalance,
        unrealizedGL,
        glType,
      });

      if (unrealizedGL > 0) {
        totalUnrealizedGains += unrealizedGL;
      } else {
        totalUnrealizedLosses += Math.abs(unrealizedGL);
      }
    }

    const netUnrealizedGL = totalUnrealizedGains - totalUnrealizedLosses;

    // Create revaluation record
    const [revaluation] = await this.db.insert(currencyRevaluations).values({
      tenantId,
      revaluationNumber,
      revaluationDate,
      baseCurrency,
      accountsProcessed: accounts.length,
      totalUnrealizedGain: totalUnrealizedGains.toFixed(2),
      totalUnrealizedLoss: totalUnrealizedLosses.toFixed(2),
      netUnrealizedGL: netUnrealizedGL.toFixed(2),
      status: 'draft',
      processedBy,
      metadata: { accounts },
    }).returning();

    // Create journal entry for unrealized G/L
    const journalEntry = await this.createRevaluationJournalEntry(
      tenantId,
      revaluation.id,
      accounts,
      revaluationDate,
      processedBy,
    );

    // Update revaluation with journal entry reference
    await this.db
      .update(currencyRevaluations)
      .set({
        journalEntryId: journalEntry.id,
        status: 'posted',
        processedAt: new Date(),
      })
      .where(eq(currencyRevaluations.id, revaluation.id));

    await this.eventBus.emit('currency.revaluation.completed', {
      revaluationId: revaluation.id,
      revaluationNumber,
      accountsProcessed: accounts.length,
      netUnrealizedGL,
    });

    this.logger.log(
      `Revaluation ${revaluationNumber} completed: ` +
      `${accounts.length} accounts, Net G/L: ${netUnrealizedGL.toFixed(2)} ${baseCurrency}`,
    );

    return {
      revaluationId: revaluation.id,
      revaluationNumber,
      revaluationDate,
      baseCurrency,
      accounts,
      summary: {
        totalAccounts: accounts.length,
        totalUnrealizedGains,
        totalUnrealizedLosses,
        netUnrealizedGL,
      },
      journalEntry,
    };
  }

  async reverseRevaluation(revaluationId: string, reversedBy: string): Promise<any> {
    const [revaluation] = await this.db
      .select()
      .from(currencyRevaluations)
      .where(eq(currencyRevaluations.id, revaluationId))
      .limit(1);

    if (!revaluation) {
      throw new NotFoundException('Revaluation not found');
    }

    if (revaluation.status === 'reversed') {
      throw new BadRequestException('Revaluation already reversed');
    }

    // Create reversing journal entry
    // (Implementation would create reversing JE)

    await this.db
      .update(currencyRevaluations)
      .set({
        status: 'reversed',
        metadata: sql`COALESCE(${currencyRevaluations.metadata}, '{}'::jsonb) || ${JSON.stringify({
          reversedBy,
          reversedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(currencyRevaluations.id, revaluationId));

    await this.eventBus.emit('currency.revaluation.reversed', {
      revaluationId,
      revaluationNumber: revaluation.revaluationNumber,
      reversedBy,
    });

    return { success: true, message: 'Revaluation reversed successfully' };
  }

  // =====================================================================================
  // HEDGE ACCOUNTING
  // =====================================================================================

  async createHedgeContract(tenantId: string, hedgeData: HedgeContract, createdBy: string): Promise<any> {
    this.logger.log(`Creating hedge contract: ${hedgeData.contractNumber} (${hedgeData.hedgeType})`);

    const [contract] = await this.db.insert(hedgeContracts).values({
      tenantId,
      contractNumber: hedgeData.contractNumber,
      hedgeType: hedgeData.hedgeType,
      currency: hedgeData.currency,
      notionalAmount: hedgeData.notionalAmount.toString(),
      strikeRate: hedgeData.strikeRate?.toString(),
      premiumPaid: hedgeData.premiumPaid?.toString(),
      contractStartDate: hedgeData.contractStartDate,
      contractEndDate: hedgeData.contractEndDate,
      counterparty: hedgeData.counterparty,
      status: 'active',
      hedgedItemReference: hedgeData.hedgedItemReference,
      metadata: {
        createdBy,
        createdAt: new Date(),
      },
    }).returning();

    await this.eventBus.emit('hedge.contract.created', {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      hedgeType: contract.hedgeType,
      notionalAmount: contract.notionalAmount,
    });

    return contract;
  }

  async updateHedgeFairValue(
    contractId: string,
    fairValue: number,
    valuationDate: Date,
    updatedBy: string,
  ): Promise<any> {
    const [contract] = await this.db
      .select()
      .from(hedgeContracts)
      .where(eq(hedgeContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException('Hedge contract not found');
    }

    const previousFairValue = parseFloat(contract.fairValue || '0');
    const fairValueChange = fairValue - previousFairValue;

    const [updated] = await this.db
      .update(hedgeContracts)
      .set({
        fairValue: fairValue.toString(),
        unrealizedGL: fairValueChange.toString(),
        metadata: sql`COALESCE(${hedgeContracts.metadata}, '{}'::jsonb) || ${JSON.stringify({
          valuationDate,
          updatedBy,
          previousFairValue,
        })}::jsonb`,
      })
      .where(eq(hedgeContracts.id, contractId))
      .returning();

    await this.eventBus.emit('hedge.fair.value.updated', {
      contractId,
      contractNumber: contract.contractNumber,
      fairValue,
      fairValueChange,
    });

    return updated;
  }

  async performHedgeEffectivenessTest(
    contractId: string,
    testDate: Date,
    hedgedItemGainLoss: number,
    testMethod: 'dollar_offset' | 'regression' | 'var_reduction' = 'dollar_offset',
  ): Promise<HedgeEffectivenessTest> {
    this.logger.log(`Performing hedge effectiveness test for contract ${contractId}`);

    const [contract] = await this.db
      .select()
      .from(hedgeContracts)
      .where(eq(hedgeContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException('Hedge contract not found');
    }

    const hedgeGainLoss = parseFloat(contract.unrealizedGL || '0');

    // Dollar-offset method
    let offsetRatio = 0;
    let effectivenessRatio = 0;

    if (Math.abs(hedgedItemGainLoss) > 0.01) {
      offsetRatio = -hedgeGainLoss / hedgedItemGainLoss;
      effectivenessRatio = Math.abs(offsetRatio) * 100;
    }

    // Hedge is effective if ratio is between 80% and 125%
    const isEffective = effectivenessRatio >= 80 && effectivenessRatio <= 125;

    // Calculate ineffective portion
    const ineffectivePortion = isEffective
      ? Math.max(0, Math.abs(hedgeGainLoss) - Math.abs(hedgedItemGainLoss))
      : Math.abs(hedgeGainLoss);

    // Get cumulative data
    const metadata = contract.metadata as any || {};
    const cumulativeHedgeGL = (metadata.cumulativeHedgeGL || 0) + hedgeGainLoss;
    const cumulativeHedgedItemGL = (metadata.cumulativeHedgedItemGL || 0) + hedgedItemGainLoss;
    const cumulativeEffectiveness = Math.abs(cumulativeHedgedItemGL) > 0.01
      ? Math.abs(-cumulativeHedgeGL / cumulativeHedgedItemGL) * 100
      : 0;

    // Update contract
    await this.db
      .update(hedgeContracts)
      .set({
        effectivenessRatio: effectivenessRatio.toFixed(2),
        metadata: sql`COALESCE(${hedgeContracts.metadata}, '{}'::jsonb) || ${JSON.stringify({
          lastEffectivenessTest: testDate,
          cumulativeHedgeGL,
          cumulativeHedgedItemGL,
          cumulativeEffectiveness,
        })}::jsonb`,
      })
      .where(eq(hedgeContracts.id, contractId));

    let conclusion = '';
    if (isEffective) {
      conclusion = `Hedge is EFFECTIVE (${effectivenessRatio.toFixed(2)}% effectiveness). Qualifies for hedge accounting.`;
    } else {
      conclusion = `Hedge is INEFFECTIVE (${effectivenessRatio.toFixed(2)}% effectiveness). Does not qualify for hedge accounting.`;
    }

    const result: HedgeEffectivenessTest = {
      hedgeContractId: contractId,
      testDate,
      testMethod,
      hedgeGainLoss,
      hedgedItemGainLoss,
      offsetRatio,
      effectivenessRatio: parseFloat(effectivenessRatio.toFixed(2)),
      isEffective,
      cumulative: {
        hedgeGainLoss: cumulativeHedgeGL,
        hedgedItemGainLoss: cumulativeHedgedItemGL,
        effectivenessRatio: parseFloat(cumulativeEffectiveness.toFixed(2)),
      },
      ineffectivePortion,
      conclusion,
    };

    await this.eventBus.emit('hedge.effectiveness.tested', {
      contractId,
      testDate,
      isEffective,
      effectivenessRatio,
    });

    return result;
  }

  async settleHedgeContract(contractId: string, settlementDate: Date, settledBy: string): Promise<any> {
    const [contract] = await this.db
      .select()
      .from(hedgeContracts)
      .where(eq(hedgeContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException('Hedge contract not found');
    }

    const realizedGL = parseFloat(contract.fairValue || '0');

    const [settled] = await this.db
      .update(hedgeContracts)
      .set({
        status: 'settled',
        settlementDate,
        realizedGL: realizedGL.toString(),
        metadata: sql`COALESCE(${hedgeContracts.metadata}, '{}'::jsonb) || ${JSON.stringify({
          settledBy,
          settledAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(hedgeContracts.id, contractId))
      .returning();

    await this.eventBus.emit('hedge.contract.settled', {
      contractId,
      contractNumber: contract.contractNumber,
      realizedGL,
      settlementDate,
    });

    this.logger.log(`Hedge contract ${contract.contractNumber} settled. Realized G/L: ${realizedGL.toFixed(2)}`);

    return settled;
  }

  // =====================================================================================
  // CURRENCY EXPOSURE ANALYSIS
  // =====================================================================================

  async analyzeCurrencyExposure(tenantId: string, baseCurrency: string): Promise<CurrencyExposureAnalysis> {
    this.logger.log(`Analyzing currency exposure for tenant ${tenantId}`);

    const analysisDate = new Date();

    // Get all foreign currency positions
    const foreignAccounts = await this.getForeignCurrencyAccounts(tenantId, baseCurrency);

    // Get all hedge contracts
    const hedges = await this.db
      .select()
      .from(hedgeContracts)
      .where(
        and(
          eq(hedgeContracts.tenantId, tenantId),
          eq(hedgeContracts.status, 'active'),
        ),
      );

    // Group by currency
    const exposureByCurrency = new Map<string, any>();

    foreignAccounts.forEach(account => {
      const existing = exposureByCurrency.get(account.currency) || {
        assets: 0,
        liabilities: 0,
      };

      if (account.foreignBalance > 0) {
        existing.assets += account.functionalCurrencyBalance;
      } else {
        existing.liabilities += Math.abs(account.functionalCurrencyBalance);
      }

      exposureByCurrency.set(account.currency, existing);
    });

    // Add hedge amounts
    hedges.forEach(hedge => {
      const existing = exposureByCurrency.get(hedge.currency) || {
        assets: 0,
        liabilities: 0,
        hedgedAmount: 0,
      };

      existing.hedgedAmount = (existing.hedgedAmount || 0) + parseFloat(hedge.notionalAmount);
      exposureByCurrency.set(hedge.currency, existing);
    });

    const exposureArray = Array.from(exposureByCurrency.entries()).map(([currency, exposure]) => {
      const netExposure = exposure.assets - exposure.liabilities;
      const hedgedAmount = exposure.hedgedAmount || 0;
      const unhedgedExposure = netExposure - hedgedAmount;

      // Calculate value at risk
      const volatility = 0.10; // 10% assumed volatility
      const atRisk = {
        valueAt1Percent: Math.abs(unhedgedExposure) * 0.01,
        valueAt5Percent: Math.abs(unhedgedExposure) * 0.05,
        valueAt10Percent: Math.abs(unhedgedExposure) * 0.10,
      };

      const recommendations: string[] = [];

      if (Math.abs(unhedgedExposure) > netExposure * 0.5) {
        recommendations.push(`Consider hedging ${((Math.abs(unhedgedExposure) / Math.abs(netExposure)) * 100).toFixed(0)}% of exposure`);
      }

      if (Math.abs(netExposure) > 1000000) {
        recommendations.push('Large exposure - recommend implementing risk limits');
      }

      return {
        currency,
        exposure: {
          assets: exposure.assets,
          liabilities: exposure.liabilities,
          netExposure,
          hedgedAmount,
          unhedgedExposure,
        },
        atRisk,
        recommendations,
      };
    });

    const totalExposure = {
      totalAssets: exposureArray.reduce((sum, e) => sum + e.exposure.assets, 0),
      totalLiabilities: exposureArray.reduce((sum, e) => sum + e.exposure.liabilities, 0),
      totalNetExposure: exposureArray.reduce((sum, e) => sum + e.exposure.netExposure, 0),
      hedgeCoverage: 0,
    };

    const totalHedged = exposureArray.reduce((sum, e) => sum + e.exposure.hedgedAmount, 0);
    totalExposure.hedgeCoverage = Math.abs(totalExposure.totalNetExposure) > 0
      ? (totalHedged / Math.abs(totalExposure.totalNetExposure)) * 100
      : 0;

    // Risk metrics
    const diversificationScore = exposureArray.length >= 5 ? 8.5 : exposureArray.length * 1.7;

    const concentrationRisk: string[] = [];
    exposureArray.forEach(e => {
      const concentrationPct = (Math.abs(e.exposure.netExposure) / Math.abs(totalExposure.totalNetExposure)) * 100;
      if (concentrationPct > 40) {
        concentrationRisk.push(`${e.currency}: ${concentrationPct.toFixed(1)}% of total exposure`);
      }
    });

    const volatilityIndex = 6.5; // Would calculate from historical rates

    return {
      baseCurrency,
      analysisDate,
      exposureByCurrency: exposureArray,
      totalExposure,
      riskMetrics: {
        diversificationScore: parseFloat(diversificationScore.toFixed(2)),
        concentrationRisk,
        volatilityIndex,
      },
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getForeignCurrencyAccounts(tenantId: string, baseCurrency: string): Promise<ForeignCurrencyAccount[]> {
    // Mock - would query actual GL accounts with foreign currency balances
    return [
      {
        accountId: '1',
        accountCode: '1100-USD',
        accountName: 'Cash - USD',
        currency: 'USD',
        foreignBalance: 50000,
        exchangeRate: 34.50,
        functionalCurrencyBalance: 1725000,
        unrealizedGL: 0,
      },
      {
        accountId: '2',
        accountCode: '1100-EUR',
        accountName: 'Cash - EUR',
        currency: 'EUR',
        foreignBalance: 30000,
        exchangeRate: 37.20,
        functionalCurrencyBalance: 1116000,
        unrealizedGL: 0,
      },
    ];
  }

  private async createRevaluationJournalEntry(
    tenantId: string,
    revaluationId: string,
    accounts: any[],
    revaluationDate: Date,
    createdBy: string,
  ): Promise<any> {
    // Mock journal entry creation
    return {
      id: crypto.randomUUID(),
      journalNumber: `JE-REV-${Date.now()}`,
      description: 'Currency revaluation - Unrealized G/L',
      entries: accounts.map(account => ({
        accountCode: account.accountCode,
        debit: account.unrealizedGL > 0 ? account.unrealizedGL : 0,
        credit: account.unrealizedGL < 0 ? Math.abs(account.unrealizedGL) : 0,
      })),
    };
  }

  private async generateRevaluationNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(currencyRevaluations)
      .where(
        and(
          eq(currencyRevaluations.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${currencyRevaluations.revaluationDate}) = ${year}`,
          sql`EXTRACT(MONTH FROM ${currencyRevaluations.revaluationDate}) = ${parseInt(month)}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `REV-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private async invalidateRateCache(tenantId: string, baseCurrency: string, targetCurrency: string): Promise<void> {
    await this.cacheService.del(this.cacheService.generateKey('rate', tenantId, baseCurrency, targetCurrency, '*'));
  }
}

