import { z } from 'zod';

export const leadSchema = z.object({
  companyName: z
    .string()
    .min(3, 'Şirket adı en az 3 karakter olmalı')
    .max(200, 'Şirket adı en fazla 200 karakter olabilir'),
  
  contactPerson: z
    .string()
    .min(3, 'Yetkili kişi adı en az 3 karakter olmalı'),
  
  email: z
    .string()
    .email('Geçerli bir e-posta adresi girin'),
  
  phone: z
    .string()
    .regex(/^(\+90|0)?[1-9][0-9]{9}$/, 'Geçerli bir Türk telefon numarası girin'),
  
  source: z.enum(['website', 'referral', 'cold_call', 'exhibition', 'partner', 'other'], {
    errorMap: () => ({ message: 'Geçerli bir kaynak seçin' }),
  }),
  
  industry: z
    .string()
    .min(3, 'Sektör adı en az 3 karakter olmalı')
    .optional(),
  
  estimatedValue: z
    .number()
    .nonnegative('Tahmini değer negatif olamaz')
    .optional(),
  
  notes: z
    .string()
    .max(1000, 'Notlar 1000 karakteri geçemez')
    .optional(),
  
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const activitySchema = z.object({
  customerId: z.string().uuid().optional(),
  
  leadId: z.string().uuid().optional(),
  
  activityType: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  
  subject: z
    .string()
    .min(5, 'Konu en az 5 karakter olmalı')
    .max(200, 'Konu en fazla 200 karakter olabilir'),
  
  description: z
    .string()
    .min(10, 'Açıklama en az 10 karakter olmalı')
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir'),
  
  activityDate: z.date().default(() => new Date()),
  
  dueDate: z.date().optional(),
  
  status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
  
  outcome: z
    .string()
    .max(500, 'Sonuç 500 karakteri geçemez')
    .optional(),
}).refine(
  (data) => !data.customerId || !data.leadId,
  {
    message: 'Müşteri veya potansiyel müşteriden birini seçin, ikisini birden değil',
  },
);

export const opportunitySchema = z.object({
  customerId: z.string().uuid('Geçerli müşteri ID girin'),
  
  name: z
    .string()
    .min(5, 'Fırsat adı en az 5 karakter olmalı')
    .max(200, 'Fırsat adı en fazla 200 karakter olabilir'),
  
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']),
  
  value: z
    .number()
    .positive('Fırsat değeri pozitif olmalı'),
  
  probability: z
    .number()
    .min(0, 'Olasılık 0\'dan küçük olamaz')
    .max(100, 'Olasılık 100\'den büyük olamaz'),
  
  expectedCloseDate: z.date(),
  
  description: z
    .string()
    .max(2000, 'Açıklama 2000 karakteri geçemez')
    .optional(),
  
  competitors: z
    .array(z.string())
    .max(10, 'En fazla 10 rakip eklenebilir')
    .optional(),
});

export const customerSegmentSchema = z.object({
  name: z
    .string()
    .min(3, 'Segment adı en az 3 karakter olmalı')
    .max(100, 'Segment adı en fazla 100 karakter olabilir'),
  
  criteria: z.object({
    minRevenue: z.number().nonnegative().optional(),
    maxRevenue: z.number().nonnegative().optional(),
    minOrders: z.number().int().nonnegative().optional(),
    industries: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    customerTypes: z.array(z.string()).optional(),
  }),
  
  description: z.string().max(500).optional(),
});

export type LeadFormData = z.infer<typeof leadSchema>;
export type ActivityFormData = z.infer<typeof activitySchema>;
export type OpportunityFormData = z.infer<typeof opportunitySchema>;
export type CustomerSegmentFormData = z.infer<typeof customerSegmentSchema>;

