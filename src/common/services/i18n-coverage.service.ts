import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class I18nCoverageService {
  private readonly logger = new Logger('I18nCoverageService');

  calculateCoverage(translations: any): any {
    const languages = Object.keys(translations);
    const totalKeys = Object.keys(translations[languages[0]] || {});
    
    const coverage = languages.reduce((acc, lang) => {
      const translatedKeys = Object.keys(translations[lang] || {});
      const coverage = (translatedKeys.length / totalKeys.length) * 100;
      acc[lang] = {
        coverage,
        translated: translatedKeys.length,
        total: totalKeys.length
      };
      return acc;
    }, {});

    this.logger.debug('i18n coverage calculated', coverage);
    return coverage;
  }

  generateReport(coverage: any): string {
    let report = 'i18n Coverage Report\n==================\n\n';
    
    for (const [lang, data] of Object.entries(coverage)) {
      report += `${lang}: ${data.coverage.toFixed(1)}% (${data.translated}/${data.total})\n`;
    }
    
    return report;
  }
}
