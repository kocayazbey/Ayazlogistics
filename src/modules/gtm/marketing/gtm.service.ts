import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface VerticalDemo {
  id: string;
  tenantId: string;
  industry: string;
  title: string;
  description: string;
  features: string[];
  useCases: string[];
  videoUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ROICalculator {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  inputs: ROICalculatorInput[];
  outputs: ROICalculatorOutput[];
  formula: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ROICalculatorInput {
  name: string;
  type: 'number' | 'percentage' | 'currency' | 'boolean';
  label: string;
  description: string;
  defaultValue?: any;
  required: boolean;
}

export interface ROICalculatorOutput {
  name: string;
  type: 'number' | 'percentage' | 'currency';
  label: string;
  description: string;
}

export interface ReferenceCustomer {
  id: string;
  tenantId: string;
  companyName: string;
  industry: string;
  logoUrl?: string;
  testimonial: string;
  results: string[];
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class GTMService {
  private readonly logger = new Logger(GTMService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createVerticalDemo(demo: Omit<VerticalDemo, 'id' | 'createdAt'>): Promise<VerticalDemo> {
    const id = `DEMO-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO vertical_demos (id, tenant_id, industry, title, description, features,
                                 use_cases, video_url, is_active, created_at)
      VALUES (${id}, ${demo.tenantId}, ${demo.industry}, ${demo.title}, ${demo.description},
              ${JSON.stringify(demo.features)}, ${JSON.stringify(demo.useCases)},
              ${demo.videoUrl || null}, ${demo.isActive}, ${now})
    `);

    this.logger.log(`Vertical demo created: ${id} for tenant ${demo.tenantId}`);

    return {
      id,
      ...demo,
      createdAt: now,
    };
  }

  async getVerticalDemos(tenantId: string): Promise<VerticalDemo[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM vertical_demos WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      industry: row.industry as string,
      title: row.title as string,
      description: row.description as string,
      features: JSON.parse(row.features as string),
      useCases: JSON.parse(row.use_cases as string),
      videoUrl: row.video_url as string,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createROICalculator(calculator: Omit<ROICalculator, 'id' | 'createdAt'>): Promise<ROICalculator> {
    const id = `ROI-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO roi_calculators (id, tenant_id, name, description, inputs, outputs, formula, is_active, created_at)
      VALUES (${id}, ${calculator.tenantId}, ${calculator.name}, ${calculator.description},
              ${JSON.stringify(calculator.inputs)}, ${JSON.stringify(calculator.outputs)},
              ${calculator.formula}, ${calculator.isActive}, ${now})
    `);

    this.logger.log(`ROI calculator created: ${id} for tenant ${calculator.tenantId}`);

    return {
      id,
      ...calculator,
      createdAt: now,
    };
  }

  async calculateROI(calculatorId: string, inputs: Record<string, any>): Promise<Record<string, any>> {
    const result = await this.db.execute(sql`
      SELECT * FROM roi_calculators WHERE id = ${calculatorId}
    `);

    if (result.length === 0) {
      throw new Error('ROI calculator not found');
    }

    const calculator = result[0];
    const formula = calculator.formula as string;
    const outputs = JSON.parse(calculator.outputs as string) as ROICalculatorOutput[];

    // Simple formula evaluation (in production, use a proper expression evaluator)
    let calculatedFormula = formula;
    for (const [key, value] of Object.entries(inputs)) {
      calculatedFormula = calculatedFormula.replace(new RegExp(`\\{${key}\\}`, 'g'), value.toString());
    }

    // This is a simplified calculation - in production, use a proper math evaluator
    const calculatedValue = this.evaluateFormula(calculatedFormula);

    const results: Record<string, any> = {};
    outputs.forEach((output, index) => {
      if (index === 0) {
        results[output.name] = calculatedValue;
      } else {
        // Additional calculations based on the first result
        results[output.name] = calculatedValue * (index + 1);
      }
    });

    return results;
  }

  async createReferenceCustomer(customer: Omit<ReferenceCustomer, 'id' | 'createdAt'>): Promise<ReferenceCustomer> {
    const id = `REF-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO reference_customers (id, tenant_id, company_name, industry, logo_url,
                                     testimonial, results, contact_name, contact_title,
                                     contact_email, is_public, is_active, created_at)
      VALUES (${id}, ${customer.tenantId}, ${customer.companyName}, ${customer.industry},
              ${customer.logoUrl || null}, ${customer.testimonial}, ${JSON.stringify(customer.results)},
              ${customer.contactName}, ${customer.contactTitle}, ${customer.contactEmail},
              ${customer.isPublic}, ${customer.isActive}, ${now})
    `);

    this.logger.log(`Reference customer created: ${id} for tenant ${customer.tenantId}`);

    return {
      id,
      ...customer,
      createdAt: now,
    };
  }

  async getReferenceCustomers(tenantId: string, isPublic?: boolean): Promise<ReferenceCustomer[]> {
    let query = sql`SELECT * FROM reference_customers WHERE tenant_id = ${tenantId}`;
    
    if (isPublic !== undefined) {
      query = sql`SELECT * FROM reference_customers WHERE tenant_id = ${tenantId} AND is_public = ${isPublic}`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      companyName: row.company_name as string,
      industry: row.industry as string,
      logoUrl: row.logo_url as string,
      testimonial: row.testimonial as string,
      results: JSON.parse(row.results as string),
      contactName: row.contact_name as string,
      contactTitle: row.contact_title as string,
      contactEmail: row.contact_email as string,
      isPublic: row.is_public as boolean,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async getGTMDashboard(tenantId: string): Promise<any> {
    const demos = await this.getVerticalDemos(tenantId);
    const activeDemos = demos.filter(demo => demo.isActive);

    const calculatorsResult = await this.db.execute(sql`
      SELECT * FROM roi_calculators WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const customers = await this.getReferenceCustomers(tenantId);
    const publicCustomers = customers.filter(customer => customer.isPublic && customer.isActive);

    const industries = [...new Set(activeDemos.map(demo => demo.industry))];

    return {
      summary: {
        totalDemos: demos.length,
        activeDemos: activeDemos.length,
        totalCalculators: calculatorsResult.length,
        totalCustomers: customers.length,
        publicCustomers: publicCustomers.length,
        industries: industries.length,
      },
      demos: activeDemos.map(demo => ({
        id: demo.id,
        industry: demo.industry,
        title: demo.title,
        features: demo.features,
        useCases: demo.useCases,
      })),
      calculators: calculatorsResult.map(row => ({
        id: row.id as string,
        name: row.name as string,
        description: row.description as string,
      })),
      customers: publicCustomers.map(customer => ({
        id: customer.id,
        companyName: customer.companyName,
        industry: customer.industry,
        testimonial: customer.testimonial,
        results: customer.results,
      })),
      industries,
    };
  }

  private evaluateFormula(formula: string): number {
    // Simple formula evaluation - in production, use a proper math expression evaluator
    try {
      // Remove any non-numeric characters except basic operators
      const cleanFormula = formula.replace(/[^0-9+\-*/.()]/g, '');
      return Function(`"use strict"; return (${cleanFormula})`)();
    } catch (error) {
      this.logger.error(`Error evaluating formula: ${formula}`, error);
      return 0;
    }
  }
}
