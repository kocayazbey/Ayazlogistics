import trTranslations from '../../../common/i18n/tr.json';
import enTranslations from '../../../common/i18n/en.json';

type TranslationKey = string;
type Translations = typeof trTranslations;

const translations: Record<string, Translations> = {
  tr: trTranslations,
  en: enTranslations,
};

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const lang = (typeof window !== 'undefined' ? localStorage.getItem('language') : null) || 'tr';
  const translation = translations[lang] || translations.tr;
  
  const keys = key.split('.');
  let value: any = translation;
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  if (!value) return key;
  
  // Replace parameters
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (match: string, paramKey: string) => 
      String(params[paramKey] || match)
    );
  }
  
  return value;
}

export function useTranslation() {
  const [lang, setLang] = React.useState('tr');
  
  React.useEffect(() => {
    setLang(localStorage.getItem('language') || 'tr');
  }, []);
  
  return { t, lang };
}

import * as React from 'react';

