import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  type: z.enum(['3pl', 'shipper', 'ecommerce', 'distributor']),
  contactPerson: z.string().min(2, 'Contact person name required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+90\s\d{3}\s\d{3}\s\d{4}$/, 'Invalid phone format (+90 5XX XXX XXXX)'),
  address: z.string().optional(),
  taxId: z.string().optional(),
  segment: z.enum(['enterprise', 'mid-market', 'smb']).optional(),
});

export const leadSchema = z.object({
  company: z.string().min(2, 'Company name required'),
  contactPerson: z.string().min(2, 'Contact person name required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+90\s\d{3}\s\d{3}\s\d{4}$/, 'Invalid phone format'),
  source: z.enum(['website', 'referral', 'cold-call', 'event', 'social-media']),
  notes: z.string().optional(),
});

export const contractSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  contractNumber: z.string().min(5, 'Contract number required'),
  contractType: z.string(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date').optional(),
  billingCycle: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  paymentTerms: z.string(),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type ContractInput = z.infer<typeof contractSchema>;

