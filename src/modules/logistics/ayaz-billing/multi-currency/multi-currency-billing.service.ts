import { Injectable } from '@nestjs/common';
import { CurrencyExchangeService } from './currency-exchange.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface MultiCurrencyInvoice {
  invoiceId: string;
  baseCurrency: string;
  baseAmount: number;
  conversions: Array<{
    currency: string;
    amount: number;
    exchangeRate: number;
    symbol: string;
  }>;
  createdAt: Date;
}

@Injectable()
export class MultiCurrencyBillingService {
  constructor(
    private readonly currencyExchange: CurrencyExchangeService,
    private readonly eventBus: EventBusService,
  ) {}

  async generateMultiCurrencyInvoice(
    invoiceId: string,
    baseCurrency: string,
    baseAmount: number,
    targetCurrencies: string[],
  ): Promise<MultiCurrencyInvoice> {
    const conversions = await this.currencyExchange.convertInvoiceToMultipleCurrencies(
      baseAmount,
      baseCurrency,
      targetCurrencies,
    );

    const invoice: MultiCurrencyInvoice = {
      invoiceId,
      baseCurrency,
      baseAmount,
      conversions,
      createdAt: new Date(),
    };

    await this.eventBus.publish('billing.multi_currency_invoice.generated', {
      invoiceId,
      baseCurrency,
      baseAmount,
      targetCurrencies,
    });

    return invoice;
  }

  async convertInvoiceAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{
    originalAmount: number;
    convertedAmount: number;
    fromCurrency: string;
    toCurrency: string;
    exchangeRate: number;
  }> {
    const conversion = await this.currencyExchange.convertAmount(
      amount,
      fromCurrency,
      toCurrency,
    );

    return {
      originalAmount: conversion.originalAmount,
      convertedAmount: conversion.convertedAmount,
      fromCurrency: conversion.fromCurrency,
      toCurrency: conversion.toCurrency,
      exchangeRate: conversion.exchangeRate,
    };
  }

  async getSupportedCurrencies(): Promise<
    Array<{ code: string; name: string; symbol: string }>
  > {
    return await this.currencyExchange.getSupportedCurrencies();
  }

  async getExchangeRateHistory(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30,
  ): Promise<Array<{ date: Date; rate: number }>> {
    return await this.currencyExchange.getExchangeRateHistory(
      fromCurrency,
      toCurrency,
      days,
    );
  }
}

