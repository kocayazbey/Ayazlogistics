import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class I18nService {
  private translations: Map<string, any> = new Map();
  private defaultLocale = 'en';

  constructor() {
    this.loadTranslations();
  }

  private loadTranslations(): void {
    const localesDir = path.join(__dirname, '../i18n');
    const files = fs.readdirSync(localesDir);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const locale = file.replace('.json', '');
        const content = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf-8'));
        this.translations.set(locale, content);
      }
    }
  }

  translate(key: string, locale: string = this.defaultLocale, params?: Record<string, any>): string {
    const translation = this.translations.get(locale) || this.translations.get(this.defaultLocale);
    const keys = key.split('.');
    let value = translation;

    for (const k of keys) {
      value = value?.[k];
    }

    if (!value) return key;
    
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  private interpolate(template: string, params: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
  }
}

