import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PseudoLocalizationService {
  private readonly logger = new Logger('PseudoLocalizationService');

  generatePseudoText(text: string): string {
    // Simulate pseudo-localization by adding brackets and extending text
    return `[${text}]${'x'.repeat(Math.floor(text.length * 0.3))}`;
  }

  async testPseudoLocalization(): Promise<void> {
    const testStrings = [
      'Welcome to AyazLogistics',
      'Dashboard',
      'Inventory Management',
      'Order Processing',
      'User Settings'
    ];

    this.logger.debug('Running pseudo-localization tests');
    
    for (const text of testStrings) {
      const pseudo = this.generatePseudoText(text);
      this.logger.debug(`Original: ${text} -> Pseudo: ${pseudo}`);
    }
  }
}
