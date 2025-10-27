import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../core/events/event-bus.service';

interface ClassificationResult {
  documentId: string;
  predictedCategory: string;
  confidence: number;
  suggestedTags: string[];
  extractedEntities: {
    dates?: string[];
    amounts?: string[];
    parties?: string[];
    locations?: string[];
  };
}

@Injectable()
export class DocumentClassifierService {
  constructor(private readonly eventBus: EventBusService) {}

  async classifyDocument(documentId: string, content: string, metadata?: any): Promise<ClassificationResult> {
    const keywords = this.extractKeywords(content);
    const category = this.predictCategory(keywords);
    const entities = this.extractEntities(content);

    const result: ClassificationResult = {
      documentId,
      predictedCategory: category.name,
      confidence: category.confidence,
      suggestedTags: this.generateTags(keywords, category.name),
      extractedEntities: entities,
    };

    await this.eventBus.publish('document.classified', {
      documentId,
      category: category.name,
      confidence: category.confidence,
    });

    return result;
  }

  private extractKeywords(content: string): string[] {
    const text = content.toLowerCase();
    const keywords = [];

    const patterns = {
      invoice: ['fatura', 'invoice', 'amount', 'payment'],
      contract: ['sözleşme', 'agreement', 'parties', 'terms'],
      bill_of_lading: ['bill of lading', 'bl number', 'shipper', 'consignee'],
      cmr: ['cmr', 'taşıma belgesi', 'carrier'],
      customs: ['gümrük', 'customs', 'declaration', 'hs code'],
    };

    for (const [category, terms] of Object.entries(patterns)) {
      if (terms.some(term => text.includes(term))) {
        keywords.push(category);
      }
    }

    return keywords;
  }

  private predictCategory(keywords: string[]): { name: string; confidence: number } {
    if (keywords.length === 0) {
      return { name: 'unknown', confidence: 0 };
    }

    const categoryScores = new Map<string, number>();
    
    keywords.forEach(keyword => {
      categoryScores.set(keyword, (categoryScores.get(keyword) || 0) + 1);
    });

    const entries = Array.from(categoryScores.entries());
    const best = entries.sort((a, b) => b[1] - a[1])[0];

    return {
      name: best[0],
      confidence: Math.min((best[1] / keywords.length) * 100, 95),
    };
  }

  private extractEntities(content: string): any {
    const dateRegex = /\d{2}[./-]\d{2}[./-]\d{4}/g;
    const amountRegex = /[₺$€]\s*[\d,]+\.?\d*/g;

    return {
      dates: content.match(dateRegex) || [],
      amounts: content.match(amountRegex) || [],
      parties: [],
      locations: [],
    };
  }

  private generateTags(keywords: string[], category: string): string[] {
    const tags = [category];
    
    const tagMap: Record<string, string[]> = {
      invoice: ['billing', 'finance', 'accounts_receivable'],
      contract: ['legal', 'agreements', 'compliance'],
      bill_of_lading: ['shipping', 'sea_freight', 'export'],
      customs: ['clearance', 'import', 'compliance'],
    };

    if (tagMap[category]) {
      tags.push(...tagMap[category]);
    }

    return tags;
  }

  async bulkClassify(documents: Array<{ id: string; content: string }>): Promise<ClassificationResult[]> {
    const results = [];

    for (const doc of documents) {
      const result = await this.classifyDocument(doc.id, doc.content);
      results.push(result);
    }

    return results;
  }
}

