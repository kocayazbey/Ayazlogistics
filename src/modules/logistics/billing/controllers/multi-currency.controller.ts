import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CurrencyExchangeService } from '../../ayaz-billing/multi-currency/currency-exchange.service';
import { MultiCurrencyBillingService } from '../../ayaz-billing/multi-currency/multi-currency-billing.service';

@Controller('api/billing/currency')
export class MultiCurrencyController {
  constructor(
    private readonly currencyExchange: CurrencyExchangeService,
    private readonly multiCurrencyBilling: MultiCurrencyBillingService,
  ) {}

  @Get('exchange-rates')
  async getExchangeRate(@Query() query: any) {
    return await this.currencyExchange.getExchangeRate(
      query.from,
      query.to,
      query.date ? new Date(query.date) : new Date(),
    );
  }

  @Post('exchange-rates/update')
  async updateExchangeRates() {
    return await this.currencyExchange.updateExchangeRates();
  }

  @Post('convert')
  async convertAmount(@Body() data: any) {
    return await this.currencyExchange.convertAmount(
      data.amount,
      data.fromCurrency,
      data.toCurrency,
      data.date ? new Date(data.date) : new Date(),
    );
  }

  @Post('bulk-convert')
  async bulkConvert(@Body() data: { conversions: any[] }) {
    return await this.currencyExchange.bulkConvert(
      data.conversions,
      new Date(),
    );
  }

  @Get('supported')
  async getSupportedCurrencies() {
    return await this.currencyExchange.getSupportedCurrencies();
  }

  @Get('history')
  async getHistory(@Query() query: any) {
    return await this.currencyExchange.getExchangeRateHistory(
      query.from,
      query.to,
      parseInt(query.days) || 30,
    );
  }

  @Post('invoice/multi-currency')
  async generateMultiCurrencyInvoice(@Body() data: any) {
    return await this.multiCurrencyBilling.generateMultiCurrencyInvoice(
      data.invoiceId,
      data.baseCurrency,
      data.baseAmount,
      data.targetCurrencies,
    );
  }
}

