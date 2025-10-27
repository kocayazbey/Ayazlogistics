import { Injectable } from '@nestjs/common';

@Injectable()
export class DocumentClassificationService {
  async classifyDocument(
    documentContent: string,
    fileName: string,
    tenantId: string,
  ): Promise<{
    documentType: string;
    confidence: number;
    suggestedCategory: string;
    keywords: string[];
  }> {
    // Mock AI classification
    const keywords = this.extractKeywords(documentContent);
    const documentType = this.inferDocumentType(fileName, keywords);

    return {
      documentType,
      confidence: 0.92,
      suggestedCategory: 'legal',
      keywords,
    };
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    return ['contract', 'agreement', 'invoice'];
  }

  private inferDocumentType(fileName: string, keywords: string[]): string {
    if (fileName.toLowerCase().includes('invoice')) return 'invoice';
    if (fileName.toLowerCase().includes('contract')) return 'contract';
    if (keywords.includes('cmr')) return 'cmr';
    return 'unknown';
  }
}

