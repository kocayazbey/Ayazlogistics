import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface DocumentTemplate {
  id: string;
  name: string;
  category: 'contract' | 'invoice' | 'shipping' | 'legal' | 'compliance';
  type: string;
  content: string;
  variables: string[];
  version: number;
  language: string;
  status: 'active' | 'archived';
}

@Injectable()
export class DocumentTemplateLibraryService {
  private templates: DocumentTemplate[] = [
    {
      id: 'tpl-001',
      name: 'Standard Service Contract',
      category: 'contract',
      type: 'service_agreement',
      content: `<html><body><h1>SERVICE AGREEMENT</h1>
        <p>Between {{customer_name}} and {{company_name}}</p>
        <p>Effective Date: {{effective_date}}</p>
        <p>Service Type: {{service_type}}</p>
        <p>Rate: {{rate}} {{currency}}</p>
        </body></html>`,
      variables: ['customer_name', 'company_name', 'effective_date', 'service_type', 'rate', 'currency'],
      version: 3,
      language: 'tr',
      status: 'active'
    },
    {
      id: 'tpl-002',
      name: 'Bill of Lading',
      category: 'shipping',
      type: 'bill_of_lading',
      content: `<html><body><h1>BILL OF LADING</h1>
        <p>BL Number: {{bl_number}}</p>
        <p>Shipper: {{shipper}}</p>
        <p>Consignee: {{consignee}}</p>
        <p>Origin: {{origin}}</p>
        <p>Destination: {{destination}}</p>
        </body></html>`,
      variables: ['bl_number', 'shipper', 'consignee', 'origin', 'destination'],
      version: 2,
      language: 'en',
      status: 'active'
    },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    return this.templates.find(t => t.id === templateId) || null;
  }

  async listTemplates(category?: string): Promise<DocumentTemplate[]> {
    if (category) {
      return this.templates.filter(t => t.category === category && t.status === 'active');
    }
    return this.templates.filter(t => t.status === 'active');
  }

  async generateDocument(templateId: string, variables: Record<string, string>): Promise<string> {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }

    let content = template.content;
    
    template.variables.forEach(variable => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, variables[variable] || '');
    });

    await this.eventBus.publish('document.generated', {
      templateId,
      variables: Object.keys(variables).length,
    });

    return content;
  }

  async createTemplate(template: Omit<DocumentTemplate, 'id' | 'version' | 'status'>): Promise<DocumentTemplate> {
    const newTemplate: DocumentTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      version: 1,
      status: 'active',
    };

    this.templates.push(newTemplate);

    await this.eventBus.publish('template.created', {
      templateId: newTemplate.id,
      category: newTemplate.category,
    });

    return newTemplate;
  }

  async updateTemplate(templateId: string, updates: Partial<DocumentTemplate>): Promise<DocumentTemplate> {
    const index = this.templates.findIndex(t => t.id === templateId);
    
    if (index === -1) {
      throw new Error('Template not found');
    }

    this.templates[index] = {
      ...this.templates[index],
      ...updates,
      version: this.templates[index].version + 1,
    };

    return this.templates[index];
  }
}

