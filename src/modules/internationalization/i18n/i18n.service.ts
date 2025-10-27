import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface Language {
  id: string;
  tenantId: string;
  code: string; // ISO 639-1
  name: string;
  nativeName: string;
  isRTL: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
}

export interface Currency {
  id: string;
  tenantId: string;
  code: string; // ISO 4217
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  isDefault: boolean;
  exchangeRate?: number;
  lastUpdated?: Date;
  createdAt: Date;
}

export interface TaxRule {
  id: string;
  tenantId: string;
  country: string;
  region?: string;
  taxType: 'VAT' | 'GST' | 'Sales' | 'Service';
  rate: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
}

export interface DataResidency {
  id: string;
  tenantId: string;
  region: string;
  country: string;
  dataCenter: string;
  compliance: string[];
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createLanguage(language: Omit<Language, 'id' | 'createdAt'>): Promise<Language> {
    const id = `LANG-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO languages (id, tenant_id, code, name, native_name, is_rtl, is_active, is_default, created_at)
      VALUES (${id}, ${language.tenantId}, ${language.code}, ${language.name}, ${language.nativeName},
              ${language.isRTL}, ${language.isActive}, ${language.isDefault}, ${now})
    `);

    this.logger.log(`Language created: ${id} for tenant ${language.tenantId}`);

    return {
      id,
      ...language,
      createdAt: now,
    };
  }

  async getLanguages(tenantId: string): Promise<Language[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM languages WHERE tenant_id = ${tenantId} ORDER BY is_default DESC, name ASC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      code: row.code as string,
      name: row.name as string,
      nativeName: row.native_name as string,
      isRTL: row.is_rtl as boolean,
      isActive: row.is_active as boolean,
      isDefault: row.is_default as boolean,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createCurrency(currency: Omit<Currency, 'id' | 'createdAt'>): Promise<Currency> {
    const id = `CURR-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO currencies (id, tenant_id, code, name, symbol, decimal_places, is_active, is_default,
                            exchange_rate, last_updated, created_at)
      VALUES (${id}, ${currency.tenantId}, ${currency.code}, ${currency.name}, ${currency.symbol},
              ${currency.decimalPlaces}, ${currency.isActive}, ${currency.isDefault},
              ${currency.exchangeRate || null}, ${currency.lastUpdated || null}, ${now})
    `);

    this.logger.log(`Currency created: ${id} for tenant ${currency.tenantId}`);

    return {
      id,
      ...currency,
      createdAt: now,
    };
  }

  async getCurrencies(tenantId: string): Promise<Currency[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM currencies WHERE tenant_id = ${tenantId} ORDER BY is_default DESC, name ASC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      code: row.code as string,
      name: row.name as string,
      symbol: row.symbol as string,
      decimalPlaces: parseInt(row.decimal_places as string),
      isActive: row.is_active as boolean,
      isDefault: row.is_default as boolean,
      exchangeRate: row.exchange_rate ? parseFloat(row.exchange_rate as string) : undefined,
      lastUpdated: row.last_updated ? new Date(row.last_updated as string) : undefined,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createTaxRule(taxRule: Omit<TaxRule, 'id' | 'createdAt'>): Promise<TaxRule> {
    const id = `TAX-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO tax_rules (id, tenant_id, country, region, tax_type, rate, is_active,
                           effective_from, effective_to, created_at)
      VALUES (${id}, ${taxRule.tenantId}, ${taxRule.country}, ${taxRule.region || null},
              ${taxRule.taxType}, ${taxRule.rate}, ${taxRule.isActive}, ${taxRule.effectiveFrom},
              ${taxRule.effectiveTo || null}, ${now})
    `);

    this.logger.log(`Tax rule created: ${id} for tenant ${taxRule.tenantId}`);

    return {
      id,
      ...taxRule,
      createdAt: now,
    };
  }

  async getTaxRules(tenantId: string, country?: string): Promise<TaxRule[]> {
    let query = sql`SELECT * FROM tax_rules WHERE tenant_id = ${tenantId}`;
    
    if (country) {
      query = sql`SELECT * FROM tax_rules WHERE tenant_id = ${tenantId} AND country = ${country}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      country: row.country as string,
      region: row.region as string,
      taxType: row.tax_type as TaxRule['taxType'],
      rate: parseFloat(row.rate as string),
      isActive: row.is_active as boolean,
      effectiveFrom: new Date(row.effective_from as string),
      effectiveTo: row.effective_to ? new Date(row.effective_to as string) : undefined,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createDataResidency(dataResidency: Omit<DataResidency, 'id' | 'createdAt'>): Promise<DataResidency> {
    const id = `DR-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO data_residency (id, tenant_id, region, country, data_center, compliance,
                                is_active, created_at)
      VALUES (${id}, ${dataResidency.tenantId}, ${dataResidency.region}, ${dataResidency.country},
              ${dataResidency.dataCenter}, ${JSON.stringify(dataResidency.compliance)},
              ${dataResidency.isActive}, ${now})
    `);

    this.logger.log(`Data residency created: ${id} for tenant ${dataResidency.tenantId}`);

    return {
      id,
      ...dataResidency,
      createdAt: now,
    };
  }

  async getDataResidency(tenantId: string): Promise<DataResidency[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM data_residency WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      region: row.region as string,
      country: row.country as string,
      dataCenter: row.data_center as string,
      compliance: JSON.parse(row.compliance as string),
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async getInternationalizationDashboard(tenantId: string): Promise<any> {
    const languages = await this.getLanguages(tenantId);
    const currencies = await this.getCurrencies(tenantId);
    const taxRules = await this.getTaxRules(tenantId);
    const dataResidency = await this.getDataResidency(tenantId);

    const activeLanguages = languages.filter(l => l.isActive);
    const activeCurrencies = currencies.filter(c => c.isActive);
    const activeTaxRules = taxRules.filter(t => t.isActive);
    const activeDataResidency = dataResidency.filter(d => d.isActive);

    return {
      summary: {
        totalLanguages: languages.length,
        activeLanguages: activeLanguages.length,
        totalCurrencies: currencies.length,
        activeCurrencies: activeCurrencies.length,
        totalTaxRules: taxRules.length,
        activeTaxRules: activeTaxRules.length,
        dataResidencyRegions: activeDataResidency.length,
      },
      languages: activeLanguages,
      currencies: activeCurrencies,
      taxRules: activeTaxRules,
      dataResidency: activeDataResidency,
      compliance: this.getComplianceStatus(activeDataResidency),
    };
  }

  private getComplianceStatus(dataResidency: DataResidency[]): any {
    const allCompliance = dataResidency.flatMap(dr => dr.compliance);
    const uniqueCompliance = [...new Set(allCompliance)];

    return {
      supportedCompliance: uniqueCompliance,
      coverage: dataResidency.length,
      regions: dataResidency.map(dr => ({
        region: dr.region,
        country: dr.country,
        compliance: dr.compliance,
      })),
    };
  }
}
