import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, desc } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import axios from 'axios';

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  effectiveDate: Date;
  createdAt: Date;
}

interface ConversionResult {
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  exchangeRate: number;
  effectiveDate: Date;
  source: string;
}

@Injectable()
export class CurrencyExchangeService {
  private readonly TCMB_API_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
  private readonly FALLBACK_RATES: Record<string, Record<string, number>> = {
    TRY: { USD: 0.031, EUR: 0.029, GBP: 0.025 },
    USD: { TRY: 32.5, EUR: 0.92, GBP: 0.79 },
    EUR: { TRY: 35.2, USD: 1.09, GBP: 0.86 },
    GBP: { TRY: 41.0, USD: 1.27, EUR: 1.16 },
  };

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date: Date = new Date(),
  ): Promise<ConversionResult> {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        originalAmount: amount,
        convertedAmount: amount,
        exchangeRate: 1,
        effectiveDate: date,
        source: 'same_currency',
      };
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);

    const convertedAmount = amount * rate.rate;

    await this.eventBus.publish('billing.currency.converted', {
      fromCurrency,
      toCurrency,
      originalAmount: amount,
      convertedAmount,
      rate: rate.rate,
    });

    return {
      fromCurrency,
      toCurrency,
      originalAmount: amount,
      convertedAmount,
      exchangeRate: rate.rate,
      effectiveDate: rate.effectiveDate,
      source: rate.source,
    };
  }

  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date = new Date(),
  ): Promise<ExchangeRate> {
    const cachedRate = await this.getCachedRate(fromCurrency, toCurrency, date);

    if (cachedRate) {
      return cachedRate;
    }

    try {
      const liveRate = await this.fetchLiveRate(fromCurrency, toCurrency);
      await this.saveExchangeRate(liveRate);
      return liveRate;
    } catch (error) {
      console.warn('Failed to fetch live rate, using fallback', error);
      return this.getFallbackRate(fromCurrency, toCurrency);
    }
  }

  async updateExchangeRates(): Promise<void> {
    const currencies = ['USD', 'EUR', 'GBP'];
    const baseCurrency = 'TRY';

    for (const currency of currencies) {
      try {
        const rate = await this.fetchLiveRate(baseCurrency, currency);
        await this.saveExchangeRate(rate);
        
        const inverseRate: ExchangeRate = {
          id: crypto.randomUUID(),
          fromCurrency: currency,
          toCurrency: baseCurrency,
          rate: 1 / rate.rate,
          source: rate.source,
          effectiveDate: rate.effectiveDate,
          createdAt: new Date(),
        };
        await this.saveExchangeRate(inverseRate);

        await this.eventBus.publish('billing.exchange_rate.updated', {
          fromCurrency: baseCurrency,
          toCurrency: currency,
          rate: rate.rate,
        });
      } catch (error) {
        console.error(`Failed to update exchange rate for ${currency}:`, error);
      }
    }

    for (let i = 0; i < currencies.length; i++) {
      for (let j = 0; j < currencies.length; j++) {
        if (i !== j) {
          try {
            const rate = await this.fetchLiveRate(currencies[i], currencies[j]);
            await this.saveExchangeRate(rate);
          } catch (error) {
            console.warn(`Failed to update ${currencies[i]} to ${currencies[j]}`, error);
          }
        }
      }
    }
  }

  async bulkConvert(
    conversions: Array<{
      amount: number;
      fromCurrency: string;
      toCurrency: string;
    }>,
    date: Date = new Date(),
  ): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const conversion of conversions) {
      const result = await this.convertAmount(
        conversion.amount,
        conversion.fromCurrency,
        conversion.toCurrency,
        date,
      );
      results.push(result);
    }

    return results;
  }

  async getSupportedCurrencies(): Promise<
    Array<{ code: string; name: string; symbol: string }>
  > {
    return [
      { code: 'TRY', name: 'Türk Lirası', symbol: '₺' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
    ];
  }

  async getExchangeRateHistory(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30,
  ): Promise<Array<{ date: Date; rate: number }>> {
    const history: Array<{ date: Date; rate: number }> = [];
    const currentDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);

      const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
      history.push({
        date,
        rate: rate.rate,
      });
    }

    return history.reverse();
  }

  private async getCachedRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date,
  ): Promise<ExchangeRate | null> {
    return null;
  }

  private async saveExchangeRate(rate: ExchangeRate): Promise<void> {
    console.log('Saving exchange rate:', rate);
  }

  private async fetchLiveRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate> {
    if (fromCurrency === 'TRY') {
      const rate = await this.fetchTCMBRate(toCurrency);
      return {
        id: crypto.randomUUID(),
        fromCurrency,
        toCurrency,
        rate,
        source: 'TCMB',
        effectiveDate: new Date(),
        createdAt: new Date(),
      };
    }

    const fallbackRate = this.FALLBACK_RATES[fromCurrency]?.[toCurrency];
    if (!fallbackRate) {
      throw new Error(`No rate available for ${fromCurrency} to ${toCurrency}`);
    }

    return {
      id: crypto.randomUUID(),
      fromCurrency,
      toCurrency,
      rate: fallbackRate,
      source: 'fallback',
      effectiveDate: new Date(),
      createdAt: new Date(),
    };
  }

  private async fetchTCMBRate(currency: string): Promise<number> {
    const rates: Record<string, number> = {
      USD: 0.031,
      EUR: 0.029,
      GBP: 0.025,
    };

    return rates[currency] || 1;
  }

  private getFallbackRate(
    fromCurrency: string,
    toCurrency: string,
  ): ExchangeRate {
    const rate = this.FALLBACK_RATES[fromCurrency]?.[toCurrency] || 1;

    return {
      id: crypto.randomUUID(),
      fromCurrency,
      toCurrency,
      rate,
      source: 'fallback',
      effectiveDate: new Date(),
      createdAt: new Date(),
    };
  }

  async convertInvoiceToMultipleCurrencies(
    invoiceAmount: number,
    baseCurrency: string,
    targetCurrencies: string[],
  ): Promise<
    Array<{
      currency: string;
      amount: number;
      exchangeRate: number;
      symbol: string;
    }>
  > {
    const results = [];
    const currencies = await this.getSupportedCurrencies();

    for (const targetCurrency of targetCurrencies) {
      const conversion = await this.convertAmount(
        invoiceAmount,
        baseCurrency,
        targetCurrency,
      );

      const currencyInfo = currencies.find((c) => c.code === targetCurrency);

      results.push({
        currency: targetCurrency,
        amount: conversion.convertedAmount,
        exchangeRate: conversion.exchangeRate,
        symbol: currencyInfo?.symbol || targetCurrency,
      });
    }

    return results;
  }

  async getCurrencyConversionReport(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    fromCurrency: string;
    toCurrency: string;
    period: { startDate: Date; endDate: Date };
    averageRate: number;
    minRate: number;
    maxRate: number;
    currentRate: number;
    volatility: number;
  }> {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const history = await this.getExchangeRateHistory(
      fromCurrency,
      toCurrency,
      days,
    );

    const rates = history.map((h) => h.rate);
    const averageRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    const variance =
      rates.reduce((sum, rate) => sum + Math.pow(rate - averageRate, 2), 0) /
      rates.length;
    const volatility = Math.sqrt(variance);

    const currentRate = await this.getExchangeRate(fromCurrency, toCurrency);

    return {
      fromCurrency,
      toCurrency,
      period: { startDate, endDate },
      averageRate,
      minRate,
      maxRate,
      currentRate: currentRate.rate,
      volatility,
    };
  }
}

