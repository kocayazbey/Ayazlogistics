import { z } from 'zod';

export const companySettingsSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+90\s\d{3}\s\d{3}\s\d{4}$/, 'Invalid phone format'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  timezone: z.string(),
  language: z.enum(['tr', 'en', 'de']),
  currency: z.enum(['TRY', 'USD', 'EUR', 'GBP']),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const notificationPreferencesSchema = z.object({
  emailNotifications: z.object({
    newOrder: z.boolean(),
    invoiceGenerated: z.boolean(),
    paymentReceived: z.boolean(),
    documentUploaded: z.boolean(),
    systemUpdates: z.boolean(),
  }),
  pushNotifications: z.object({
    vehicleStatus: z.boolean(),
    deliveryCompleted: z.boolean(),
    urgentAlerts: z.boolean(),
    dailySummary: z.boolean(),
  }),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

