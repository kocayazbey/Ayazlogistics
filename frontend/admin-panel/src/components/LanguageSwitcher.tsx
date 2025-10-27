import React from 'react';
import { Select } from '@ayazlogistics/design-system';

export const LanguageSwitcher: React.FC = () => {
  const [language, setLanguage] = React.useState('tr');

  const languages = [
    { value: 'tr', label: '🇹🇷 Türkçe' },
    { value: 'en', label: '🇬🇧 English' },
    { value: 'ar', label: '🇸🇦 العربية' },
  ];

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    
    // Set language in localStorage
    localStorage.setItem('language', newLang);
    
    // Set HTML dir attribute for RTL
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
    
    // Reload to apply language
    window.location.reload();
  };

  React.useEffect(() => {
    // Get language from localStorage or browser
    const savedLang = localStorage.getItem('language') || navigator.language.split('-')[0] || 'tr';
    setLanguage(savedLang);
    document.documentElement.lang = savedLang;
    document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
  }, []);

  return (
    <Select
      value={language}
      onChange={handleLanguageChange}
      options={languages.map(lang => ({ label: lang.label, value: lang.value }))}
    />
  );
};

