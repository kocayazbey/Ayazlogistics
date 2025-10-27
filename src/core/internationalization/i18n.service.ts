import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../events/event-bus.service';

interface Translation {
  key: string;
  language: string;
  value: string;
  context?: string;
  isPlural?: boolean;
  pluralForms?: string[];
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  exchangeRate: number;
  isBase: boolean;
}

interface Locale {
  language: string;
  country: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  isRTL: boolean;
}

@Injectable()
export class I18nService {
  private readonly logger = new Logger(I18nService.name);
  private readonly translations: Map<string, Translation> = new Map();
  private readonly currencies: Map<string, Currency> = new Map();
  private readonly locales: Map<string, Locale> = new Map();
  private readonly supportedLanguages = ['en', 'tr', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar', 'zh'];
  private readonly supportedCurrencies = ['USD', 'EUR', 'TRY', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {
    this.initializeTranslations();
    this.initializeCurrencies();
    this.initializeLocales();
  }

  /**
   * Get translation for a key
   */
  translate(key: string, language: string, params?: Record<string, any>): string {
    const translationKey = `${key}_${language}`;
    const translation = this.translations.get(translationKey);
    
    if (!translation) {
      this.logger.warn(`Translation not found for key: ${key}, language: ${language}`);
      return key; // Return key as fallback
    }

    let value = translation.value;

    // Handle plural forms
    if (translation.isPlural && params?.count !== undefined) {
      const pluralForm = this.getPluralForm(translation.pluralForms || [], params.count, language);
      if (pluralForm) {
        value = pluralForm;
      }
    }

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      });
    }

    return value;
  }

  /**
   * Get plural form
   */
  private getPluralForm(pluralForms: string[], count: number, language: string): string | null {
    if (pluralForms.length === 0) return null;

    const pluralRule = this.getPluralRule(language);
    const pluralIndex = pluralRule(count);
    
    return pluralForms[pluralIndex] || pluralForms[0];
  }

  /**
   * Get plural rule for language
   */
  private getPluralRule(language: string): (count: number) => number {
    const rules: Record<string, (count: number) => number> = {
      en: (n) => n === 1 ? 0 : 1,
      tr: (n) => 0, // Turkish has no plural forms
      de: (n) => n === 1 ? 0 : 1,
      fr: (n) => n <= 1 ? 0 : 1,
      es: (n) => n === 1 ? 0 : 1,
      it: (n) => n === 1 ? 0 : 1,
      pt: (n) => n === 1 ? 0 : 1,
      ru: (n) => {
        if (n % 10 === 1 && n % 100 !== 11) return 0;
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 1;
        return 2;
      },
      ar: (n) => {
        if (n === 0) return 0;
        if (n === 1) return 1;
        if (n === 2) return 2;
        if (n % 100 >= 3 && n % 100 <= 10) return 3;
        if (n % 100 >= 11 && n % 100 <= 99) return 4;
        return 5;
      },
      zh: (n) => 0, // Chinese has no plural forms
    };

    return rules[language] || rules.en;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currencyCode: string, locale: string = 'en-US'): string {
    const currency = this.currencies.get(currencyCode);
    if (!currency) {
      this.logger.warn(`Currency not found: ${currencyCode}`);
      return `${amount} ${currencyCode}`;
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currency.decimalPlaces,
        maximumFractionDigits: currency.decimalPlaces,
      }).format(amount);
    } catch (error) {
      this.logger.error(`Error formatting currency: ${error.message}`);
      return `${currency.symbol}${amount.toFixed(currency.decimalPlaces)}`;
    }
  }

  /**
   * Format number
   */
  formatNumber(number: number, locale: string = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale).format(number);
    } catch (error) {
      this.logger.error(`Error formatting number: ${error.message}`);
      return number.toString();
    }
  }

  /**
   * Format date
   */
  formatDate(date: Date, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch (error) {
      this.logger.error(`Error formatting date: ${error.message}`);
      return date.toISOString();
    }
  }

  /**
   * Convert currency
   */
  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    const fromRate = this.currencies.get(fromCurrency)?.exchangeRate || 1;
    const toRate = this.currencies.get(toCurrency)?.exchangeRate || 1;
    
    // Convert to base currency first, then to target currency
    const baseAmount = amount / fromRate;
    return baseAmount * toRate;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return [...this.supportedCurrencies];
  }

  /**
   * Get locale information
   */
  getLocale(language: string, country: string): Locale | null {
    const localeKey = `${language}_${country}`;
    return this.locales.get(localeKey) || null;
  }

  /**
   * Add translation
   */
  addTranslation(translation: Omit<Translation, 'key'>): string {
    const key = `${translation.key}_${translation.language}`;
    const newTranslation: Translation = { key, ...translation };
    this.translations.set(key, newTranslation);
    
    this.eventBus.emit('translation.added', { key, language: translation.language });
    return key;
  }

  /**
   * Update translation
   */
  updateTranslation(key: string, language: string, updates: Partial<Translation>): boolean {
    const translationKey = `${key}_${language}`;
    const translation = this.translations.get(translationKey);
    
    if (!translation) return false;
    
    Object.assign(translation, updates);
    this.eventBus.emit('translation.updated', { key, language });
    return true;
  }

  /**
   * Get all translations for a language
   */
  getTranslationsForLanguage(language: string): Translation[] {
    return Array.from(this.translations.values())
      .filter(translation => translation.language === language);
  }

  /**
   * Get missing translations
   */
  getMissingTranslations(): Array<{ key: string; missingLanguages: string[] }> {
    const allKeys = new Set<string>();
    const translationsByKey = new Map<string, Set<string>>();

    // Collect all keys and their languages
    for (const translation of this.translations.values()) {
      const key = translation.key.replace(`_${translation.language}`, '');
      allKeys.add(key);
      
      if (!translationsByKey.has(key)) {
        translationsByKey.set(key, new Set());
      }
      translationsByKey.get(key)!.add(translation.language);
    }

    // Find missing translations
    const missing: Array<{ key: string; missingLanguages: string[] }> = [];
    
    for (const key of allKeys) {
      const existingLanguages = translationsByKey.get(key) || new Set();
      const missingLanguages = this.supportedLanguages.filter(lang => !existingLanguages.has(lang));
      
      if (missingLanguages.length > 0) {
        missing.push({ key, missingLanguages });
      }
    }

    return missing;
  }

  /**
   * Initialize translations
   */
  private initializeTranslations(): void {
    const commonTranslations = [
      // English
      { key: 'welcome', language: 'en', value: 'Welcome' },
      { key: 'login', language: 'en', value: 'Login' },
      { key: 'logout', language: 'en', value: 'Logout' },
      { key: 'dashboard', language: 'en', value: 'Dashboard' },
      { key: 'orders', language: 'en', value: 'Orders' },
      { key: 'inventory', language: 'en', value: 'Inventory' },
      { key: 'shipping', language: 'en', value: 'Shipping' },
      { key: 'receiving', language: 'en', value: 'Receiving' },
      { key: 'picking', language: 'en', value: 'Picking' },
      { key: 'putaway', language: 'en', value: 'Putaway' },
      { key: 'cycle_count', language: 'en', value: 'Cycle Count' },
      { key: 'reports', language: 'en', value: 'Reports' },
      { key: 'settings', language: 'en', value: 'Settings' },
      { key: 'help', language: 'en', value: 'Help' },
      { key: 'search', language: 'en', value: 'Search' },
      { key: 'filter', language: 'en', value: 'Filter' },
      { key: 'sort', language: 'en', value: 'Sort' },
      { key: 'save', language: 'en', value: 'Save' },
      { key: 'cancel', language: 'en', value: 'Cancel' },
      { key: 'delete', language: 'en', value: 'Delete' },
      { key: 'edit', language: 'en', value: 'Edit' },
      { key: 'create', language: 'en', value: 'Create' },
      { key: 'update', language: 'en', value: 'Update' },
      { key: 'view', language: 'en', value: 'View' },
      { key: 'export', language: 'en', value: 'Export' },
      { key: 'import', language: 'en', value: 'Import' },
      { key: 'print', language: 'en', value: 'Print' },
      { key: 'email', language: 'en', value: 'Email' },
      { key: 'phone', language: 'en', value: 'Phone' },
      { key: 'address', language: 'en', value: 'Address' },
      { key: 'city', language: 'en', value: 'City' },
      { key: 'country', language: 'en', value: 'Country' },
      { key: 'postal_code', language: 'en', value: 'Postal Code' },
      { key: 'status', language: 'en', value: 'Status' },
      { key: 'date', language: 'en', value: 'Date' },
      { key: 'time', language: 'en', value: 'Time' },
      { key: 'quantity', language: 'en', value: 'Quantity' },
      { key: 'price', language: 'en', value: 'Price' },
      { key: 'total', language: 'en', value: 'Total' },
      { key: 'subtotal', language: 'en', value: 'Subtotal' },
      { key: 'tax', language: 'en', value: 'Tax' },
      { key: 'discount', language: 'en', value: 'Discount' },
      { key: 'shipping_cost', language: 'en', value: 'Shipping Cost' },
      { key: 'payment_method', language: 'en', value: 'Payment Method' },
      { key: 'delivery_date', language: 'en', value: 'Delivery Date' },
      { key: 'tracking_number', language: 'en', value: 'Tracking Number' },
      { key: 'customer', language: 'en', value: 'Customer' },
      { key: 'supplier', language: 'en', value: 'Supplier' },
      { key: 'product', language: 'en', value: 'Product' },
      { key: 'sku', language: 'en', value: 'SKU' },
      { key: 'barcode', language: 'en', value: 'Barcode' },
      { key: 'description', language: 'en', value: 'Description' },
      { key: 'category', language: 'en', value: 'Category' },
      { key: 'brand', language: 'en', value: 'Brand' },
      { key: 'weight', language: 'en', value: 'Weight' },
      { key: 'dimensions', language: 'en', value: 'Dimensions' },
      { key: 'location', language: 'en', value: 'Location' },
      { key: 'warehouse', language: 'en', value: 'Warehouse' },
      { key: 'zone', language: 'en', value: 'Zone' },
      { key: 'aisle', language: 'en', value: 'Aisle' },
      { key: 'shelf', language: 'en', value: 'Shelf' },
      { key: 'bin', language: 'en', value: 'Bin' },
      { key: 'pallet', language: 'en', value: 'Pallet' },
      { key: 'box', language: 'en', value: 'Box' },
      { key: 'carton', language: 'en', value: 'Carton' },
      { key: 'package', language: 'en', value: 'Package' },
      { key: 'shipment', language: 'en', value: 'Shipment' },
      { key: 'delivery', language: 'en', value: 'Delivery' },
      { key: 'pickup', language: 'en', value: 'Pickup' },
      { key: 'return', language: 'en', value: 'Return' },
      { key: 'refund', language: 'en', value: 'Refund' },
      { key: 'exchange', language: 'en', value: 'Exchange' },
      { key: 'warranty', language: 'en', value: 'Warranty' },
      { key: 'guarantee', language: 'en', value: 'Guarantee' },
      { key: 'quality', language: 'en', value: 'Quality' },
      { key: 'inspection', language: 'en', value: 'Inspection' },
      { key: 'testing', language: 'en', value: 'Testing' },
      { key: 'certification', language: 'en', value: 'Certification' },
      { key: 'compliance', language: 'en', value: 'Compliance' },
      { key: 'safety', language: 'en', value: 'Safety' },
      { key: 'security', language: 'en', value: 'Security' },
      { key: 'privacy', language: 'en', value: 'Privacy' },
      { key: 'terms', language: 'en', value: 'Terms' },
      { key: 'conditions', language: 'en', value: 'Conditions' },
      { key: 'agreement', language: 'en', value: 'Agreement' },
      { key: 'contract', language: 'en', value: 'Contract' },
      { key: 'license', language: 'en', value: 'License' },
      { key: 'permit', language: 'en', value: 'Permit' },
      { key: 'authorization', language: 'en', value: 'Authorization' },
      { key: 'permission', language: 'en', value: 'Permission' },
      { key: 'access', language: 'en', value: 'Access' },
      { key: 'login', language: 'en', value: 'Login' },
      { key: 'logout', language: 'en', value: 'Logout' },
      { key: 'register', language: 'en', value: 'Register' },
      { key: 'signup', language: 'en', value: 'Sign Up' },
      { key: 'signin', language: 'en', value: 'Sign In' },
      { key: 'forgot_password', language: 'en', value: 'Forgot Password' },
      { key: 'reset_password', language: 'en', value: 'Reset Password' },
      { key: 'change_password', language: 'en', value: 'Change Password' },
      { key: 'profile', language: 'en', value: 'Profile' },
      { key: 'account', language: 'en', value: 'Account' },
      { key: 'user', language: 'en', value: 'User' },
      { key: 'admin', language: 'en', value: 'Admin' },
      { key: 'manager', language: 'en', value: 'Manager' },
      { key: 'supervisor', language: 'en', value: 'Supervisor' },
      { key: 'operator', language: 'en', value: 'Operator' },
      { key: 'driver', language: 'en', value: 'Driver' },
      { key: 'employee', language: 'en', value: 'Employee' },
      { key: 'staff', language: 'en', value: 'Staff' },
      { key: 'team', language: 'en', value: 'Team' },
      { key: 'department', language: 'en', value: 'Department' },
      { key: 'division', language: 'en', value: 'Division' },
      { key: 'branch', language: 'en', value: 'Branch' },
      { key: 'office', language: 'en', value: 'Office' },
      { key: 'headquarters', language: 'en', value: 'Headquarters' },
      { key: 'facility', language: 'en', value: 'Facility' },
      { key: 'building', language: 'en', value: 'Building' },
      { key: 'floor', language: 'en', value: 'Floor' },
      { key: 'room', language: 'en', value: 'Room' },
      { key: 'area', language: 'en', value: 'Area' },
      { key: 'space', language: 'en', value: 'Space' },
      { key: 'capacity', language: 'en', value: 'Capacity' },
      { key: 'volume', language: 'en', value: 'Volume' },
      { key: 'size', language: 'en', value: 'Size' },
      { key: 'length', language: 'en', value: 'Length' },
      { key: 'width', language: 'en', value: 'Width' },
      { key: 'height', language: 'en', value: 'Height' },
      { key: 'depth', language: 'en', value: 'Depth' },
      { key: 'diameter', language: 'en', value: 'Diameter' },
      { key: 'radius', language: 'en', value: 'Radius' },
      { key: 'circumference', language: 'en', value: 'Circumference' },
      { key: 'perimeter', language: 'en', value: 'Perimeter' },
      { key: 'surface', language: 'en', value: 'Surface' },
      { key: 'area', language: 'en', value: 'Area' },
      { key: 'volume', language: 'en', value: 'Volume' },
      { key: 'mass', language: 'en', value: 'Mass' },
      { key: 'density', language: 'en', value: 'Density' },
      { key: 'temperature', language: 'en', value: 'Temperature' },
      { key: 'pressure', language: 'en', value: 'Pressure' },
      { key: 'humidity', language: 'en', value: 'Humidity' },
      { key: 'moisture', language: 'en', value: 'Moisture' },
      { key: 'vibration', language: 'en', value: 'Vibration' },
      { key: 'noise', language: 'en', value: 'Noise' },
      { key: 'light', language: 'en', value: 'Light' },
      { key: 'sound', language: 'en', value: 'Sound' },
      { key: 'color', language: 'en', value: 'Color' },
      { key: 'texture', language: 'en', value: 'Texture' },
      { key: 'material', language: 'en', value: 'Material' },
      { key: 'composition', language: 'en', value: 'Composition' },
      { key: 'ingredients', language: 'en', value: 'Ingredients' },
      { key: 'components', language: 'en', value: 'Components' },
      { key: 'parts', language: 'en', value: 'Parts' },
      { key: 'assembly', language: 'en', value: 'Assembly' },
      { key: 'disassembly', language: 'en', value: 'Disassembly' },
      { key: 'installation', language: 'en', value: 'Installation' },
      { key: 'removal', language: 'en', value: 'Removal' },
      { key: 'replacement', language: 'en', value: 'Replacement' },
      { key: 'repair', language: 'en', value: 'Repair' },
      { key: 'maintenance', language: 'en', value: 'Maintenance' },
      { key: 'service', language: 'en', value: 'Service' },
      { key: 'support', language: 'en', value: 'Support' },
      { key: 'help', language: 'en', value: 'Help' },
      { key: 'assistance', language: 'en', value: 'Assistance' },
      { key: 'guidance', language: 'en', value: 'Guidance' },
      { key: 'instruction', language: 'en', value: 'Instruction' },
      { key: 'manual', language: 'en', value: 'Manual' },
      { key: 'guide', language: 'en', value: 'Guide' },
      { key: 'tutorial', language: 'en', value: 'Tutorial' },
      { key: 'training', language: 'en', value: 'Training' },
      { key: 'education', language: 'en', value: 'Education' },
      { key: 'learning', language: 'en', value: 'Learning' },
      { key: 'knowledge', language: 'en', value: 'Knowledge' },
      { key: 'information', language: 'en', value: 'Information' },
      { key: 'data', language: 'en', value: 'Data' },
      { key: 'database', language: 'en', value: 'Database' },
      { key: 'record', language: 'en', value: 'Record' },
      { key: 'entry', language: 'en', value: 'Entry' },
      { key: 'field', language: 'en', value: 'Field' },
      { key: 'column', language: 'en', value: 'Column' },
      { key: 'row', language: 'en', value: 'Row' },
      { key: 'table', language: 'en', value: 'Table' },
      { key: 'list', language: 'en', value: 'List' },
      { key: 'array', language: 'en', value: 'Array' },
      { key: 'collection', language: 'en', value: 'Collection' },
      { key: 'set', language: 'en', value: 'Set' },
      { key: 'group', language: 'en', value: 'Group' },
      { key: 'category', language: 'en', value: 'Category' },
      { key: 'class', language: 'en', value: 'Class' },
      { key: 'type', language: 'en', value: 'Type' },
      { key: 'kind', language: 'en', value: 'Kind' },
      { key: 'sort', language: 'en', value: 'Sort' },
      { key: 'order', language: 'en', value: 'Order' },
      { key: 'sequence', language: 'en', value: 'Sequence' },
      { key: 'series', language: 'en', value: 'Series' },
      { key: 'chain', language: 'en', value: 'Chain' },
      { key: 'link', language: 'en', value: 'Link' },
      { key: 'connection', language: 'en', value: 'Connection' },
      { key: 'relation', language: 'en', value: 'Relation' },
      { key: 'relationship', language: 'en', value: 'Relationship' },
      { key: 'association', language: 'en', value: 'Association' },
      { key: 'bond', language: 'en', value: 'Bond' },
      { key: 'tie', language: 'en', value: 'Tie' },
      { key: 'attachment', language: 'en', value: 'Attachment' },
      { key: 'file', language: 'en', value: 'File' },
      { key: 'document', language: 'en', value: 'Document' },
      { key: 'paper', language: 'en', value: 'Paper' },
      { key: 'sheet', language: 'en', value: 'Sheet' },
      { key: 'page', language: 'en', value: 'Page' },
      { key: 'section', language: 'en', value: 'Section' },
      { key: 'chapter', language: 'en', value: 'Chapter' },
      { key: 'part', language: 'en', value: 'Part' },
      { key: 'portion', language: 'en', value: 'Portion' },
      { key: 'segment', language: 'en', value: 'Segment' },
      { key: 'fragment', language: 'en', value: 'Fragment' },
      { key: 'piece', language: 'en', value: 'Piece' },
      { key: 'bit', language: 'en', value: 'Bit' },
      { key: 'chunk', language: 'en', value: 'Chunk' },
      { key: 'block', language: 'en', value: 'Block' },
      { key: 'unit', language: 'en', value: 'Unit' },
      { key: 'item', language: 'en', value: 'Item' },
      { key: 'object', language: 'en', value: 'Object' },
      { key: 'thing', language: 'en', value: 'Thing' },
      { key: 'entity', language: 'en', value: 'Entity' },
      { key: 'element', language: 'en', value: 'Element' },
      { key: 'factor', language: 'en', value: 'Factor' },
      { key: 'aspect', language: 'en', value: 'Aspect' },
      { key: 'feature', language: 'en', value: 'Feature' },
      { key: 'characteristic', language: 'en', value: 'Characteristic' },
      { key: 'property', language: 'en', value: 'Property' },
      { key: 'attribute', language: 'en', value: 'Attribute' },
      { key: 'quality', language: 'en', value: 'Quality' },
      { key: 'trait', language: 'en', value: 'Trait' },
      { key: 'mark', language: 'en', value: 'Mark' },
      { key: 'sign', language: 'en', value: 'Sign' },
      { key: 'symbol', language: 'en', value: 'Symbol' },
      { key: 'icon', language: 'en', value: 'Icon' },
      { key: 'logo', language: 'en', value: 'Logo' },
      { key: 'emblem', language: 'en', value: 'Emblem' },
      { key: 'badge', language: 'en', value: 'Badge' },
      { key: 'label', language: 'en', value: 'Label' },
      { key: 'tag', language: 'en', value: 'Tag' },
      { key: 'sticker', language: 'en', value: 'Sticker' },
      { key: 'stamp', language: 'en', value: 'Stamp' },
      { key: 'seal', language: 'en', value: 'Seal' },
      { key: 'marking', language: 'en', value: 'Marking' },
      { key: 'inscription', language: 'en', value: 'Inscription' },
      { key: 'text', language: 'en', value: 'Text' },
      { key: 'word', language: 'en', value: 'Word' },
      { key: 'phrase', language: 'en', value: 'Phrase' },
      { key: 'sentence', language: 'en', value: 'Sentence' },
      { key: 'paragraph', language: 'en', value: 'Paragraph' },
      { key: 'passage', language: 'en', value: 'Passage' },
      { key: 'excerpt', language: 'en', value: 'Excerpt' },
      { key: 'quote', language: 'en', value: 'Quote' },
      { key: 'citation', language: 'en', value: 'Citation' },
      { key: 'reference', language: 'en', value: 'Reference' },
      { key: 'source', language: 'en', value: 'Source' },
      { key: 'origin', language: 'en', value: 'Origin' },
      { key: 'beginning', language: 'en', value: 'Beginning' },
      { key: 'start', language: 'en', value: 'Start' },
      { key: 'commencement', language: 'en', value: 'Commencement' },
      { key: 'initiation', language: 'en', value: 'Initiation' },
      { key: 'launch', language: 'en', value: 'Launch' },
      { key: 'opening', language: 'en', value: 'Opening' },
      { key: 'introduction', language: 'en', value: 'Introduction' },
      { key: 'preface', language: 'en', value: 'Preface' },
      { key: 'foreword', language: 'en', value: 'Foreword' },
      { key: 'prologue', language: 'en', value: 'Prologue' },
      { key: 'preamble', language: 'en', value: 'Preamble' },
      { key: 'prelude', language: 'en', value: 'Prelude' },
      { key: 'overture', language: 'en', value: 'Overture' },
      { key: 'beginning', language: 'en', value: 'Beginning' },
      { key: 'start', language: 'en', value: 'Start' },
      { key: 'commencement', language: 'en', value: 'Commencement' },
      { key: 'initiation', language: 'en', value: 'Initiation' },
      { key: 'launch', language: 'en', value: 'Launch' },
      { key: 'opening', language: 'en', value: 'Opening' },
      { key: 'introduction', language: 'en', value: 'Introduction' },
      { key: 'preface', language: 'en', value: 'Preface' },
      { key: 'foreword', language: 'en', value: 'Foreword' },
      { key: 'prologue', language: 'en', value: 'Prologue' },
      { key: 'preamble', language: 'en', value: 'Preamble' },
      { key: 'prelude', language: 'en', value: 'Prelude' },
      { key: 'overture', language: 'en', value: 'Overture' },
    ];

    // Add Turkish translations
    const turkishTranslations = [
      { key: 'welcome', language: 'tr', value: 'Hoş Geldiniz' },
      { key: 'login', language: 'tr', value: 'Giriş' },
      { key: 'logout', language: 'tr', value: 'Çıkış' },
      { key: 'dashboard', language: 'tr', value: 'Kontrol Paneli' },
      { key: 'orders', language: 'tr', value: 'Siparişler' },
      { key: 'inventory', language: 'tr', value: 'Envanter' },
      { key: 'shipping', language: 'tr', value: 'Sevkiyat' },
      { key: 'receiving', language: 'tr', value: 'Mal Kabul' },
      { key: 'picking', language: 'tr', value: 'Toplama' },
      { key: 'putaway', language: 'tr', value: 'Yerleştirme' },
      { key: 'cycle_count', language: 'tr', value: 'Sayım' },
      { key: 'reports', language: 'tr', value: 'Raporlar' },
      { key: 'settings', language: 'tr', value: 'Ayarlar' },
      { key: 'help', language: 'tr', value: 'Yardım' },
    ];

    [...commonTranslations, ...turkishTranslations].forEach(translation => {
      this.addTranslation(translation);
    });
  }

  /**
   * Initialize currencies
   */
  private initializeCurrencies(): void {
    const currencies: Currency[] = [
      { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, exchangeRate: 1.0, isBase: true },
      { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, exchangeRate: 0.85, isBase: false },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺', decimalPlaces: 2, exchangeRate: 30.0, isBase: false },
      { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, exchangeRate: 0.75, isBase: false },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, exchangeRate: 110.0, isBase: false },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, exchangeRate: 1.25, isBase: false },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, exchangeRate: 1.35, isBase: false },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', decimalPlaces: 2, exchangeRate: 0.92, isBase: false },
    ];

    currencies.forEach(currency => {
      this.currencies.set(currency.code, currency);
    });
  }

  /**
   * Initialize locales
   */
  private initializeLocales(): void {
    const locales: Locale[] = [
      { language: 'en', country: 'US', currency: 'USD', dateFormat: 'MM/dd/yyyy', timeFormat: 'hh:mm a', numberFormat: '#,##0.00', isRTL: false },
      { language: 'tr', country: 'TR', currency: 'TRY', dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', numberFormat: '#.##0,00', isRTL: false },
      { language: 'de', country: 'DE', currency: 'EUR', dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', numberFormat: '#.##0,00', isRTL: false },
      { language: 'fr', country: 'FR', currency: 'EUR', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm', numberFormat: '# ##0,00', isRTL: false },
      { language: 'es', country: 'ES', currency: 'EUR', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm', numberFormat: '#.##0,00', isRTL: false },
      { language: 'it', country: 'IT', currency: 'EUR', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm', numberFormat: '#.##0,00', isRTL: false },
      { language: 'pt', country: 'PT', currency: 'EUR', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm', numberFormat: '#.##0,00', isRTL: false },
      { language: 'ru', country: 'RU', currency: 'RUB', dateFormat: 'dd.MM.yyyy', timeFormat: 'HH:mm', numberFormat: '# ##0,00', isRTL: false },
      { language: 'ar', country: 'SA', currency: 'SAR', dateFormat: 'dd/MM/yyyy', timeFormat: 'HH:mm', numberFormat: '#,##0.00', isRTL: true },
      { language: 'zh', country: 'CN', currency: 'CNY', dateFormat: 'yyyy/MM/dd', timeFormat: 'HH:mm', numberFormat: '#,##0.00', isRTL: false },
    ];

    locales.forEach(locale => {
      const key = `${locale.language}_${locale.country}`;
      this.locales.set(key, locale);
    });
  }
}
