import { z } from 'zod';

export const contractSchema = z.object({
  customerId: z.string().uuid('Geçerli müşteri ID girin'),
  
  contractNumber: z
    .string()
    .min(5, 'Sözleşme numarası en az 5 karakter olmalı')
    .max(50, 'Sözleşme numarası en fazla 50 karakter olabilir'),
  
  startDate: z.date(),
  
  endDate: z.date(),
  
  billingModel: z.enum(['monthly', 'quarterly', 'per_shipment', 'per_usage', 'tiered'], {
    errorMap: () => ({ message: 'Geçerli bir faturalama modeli seçin' }),
  }),
  
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY'),
  
  paymentTerms: z
    .string()
    .min(5, 'Ödeme koşulları en az 5 karakter olmalı')
    .optional(),
  
  rates: z
    .array(
      z.object({
        rateType: z.string().min(2),
        rateName: z.string().min(3),
        rateAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Geçerli tutar girin'),
        unitOfMeasure: z.string().min(2),
        validFrom: z.date().optional(),
        validUntil: z.date().optional(),
        minimumCharge: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
      }),
    )
    .min(1, 'En az 1 fiyat satırı olmalı'),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'Bitiş tarihi başlangıç tarihinden sonra olmalı',
    path: ['endDate'],
  },
);

export const invoiceSchema = z.object({
  customerId: z.string().uuid('Geçerli müşteri ID girin'),
  
  contractId: z.string().uuid('Geçerli sözleşme ID girin').optional(),
  
  invoiceDate: z.date().default(() => new Date()),
  
  dueDate: z.date(),
  
  lineItems: z
    .array(
      z.object({
        description: z.string().min(3, 'Açıklama en az 3 karakter olmalı'),
        quantity: z.number().int().positive('Miktar pozitif olmalı'),
        unitPrice: z.number().positive('Birim fiyat pozitif olmalı'),
        taxRate: z.number().min(0).max(100, 'Vergi oranı 0-100 arası olmalı').default(20),
      }),
    )
    .min(1, 'En az 1 kalem olmalı'),
  
  notes: z.string().max(1000, 'Notlar 1000 karakteri geçemez').optional(),
  
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']).default('TRY'),
}).refine(
  (data) => data.dueDate >= data.invoiceDate,
  {
    message: 'Vade tarihi fatura tarihinden önce olamaz',
    path: ['dueDate'],
  },
);

export const priceCalculationSchema = z.object({
  contractId: z.string().uuid(),
  
  serviceType: z.string().min(2),
  
  quantity: z.number().int().positive('Miktar pozitif olmalı'),
  
  usageDate: z.date(),
  
  distance: z.number().positive('Mesafe pozitif olmalı').optional(),
  
  weight: z.number().positive('Ağırlık pozitif olmalı').optional(),
  
  isPeakSeason: z.boolean().default(false),
  
  isUrgent: z.boolean().default(false),
});

export type ContractFormData = z.infer<typeof contractSchema>;
export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type PriceCalculationFormData = z.infer<typeof priceCalculationSchema>;

