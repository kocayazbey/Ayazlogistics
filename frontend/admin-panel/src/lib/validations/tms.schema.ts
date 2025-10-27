import { z } from 'zod';

export const vehicleSchema = z.object({
  plateNumber: z
    .string()
    .min(5, 'Plaka en az 5 karakter olmalı')
    .max(10, 'Plaka en fazla 10 karakter olabilir')
    .regex(/^[0-9]{2}[A-Z]{1,3}[0-9]{1,4}$/, 'Geçersiz Türk plaka formatı'),
  
  type: z.enum(['truck', 'van', 'trailer', 'refrigerated'], {
    errorMap: () => ({ message: 'Geçerli bir araç tipi seçin' }),
  }),
  
  model: z
    .string()
    .min(3, 'Model adı en az 3 karakter olmalı'),
  
  capacity: z
    .number()
    .positive('Kapasite pozitif olmalı')
    .max(50000, 'Kapasite 50 ton\'u geçemez'),
  
  year: z
    .number()
    .int('Yıl tam sayı olmalı')
    .min(2000, 'Araç 2000 yılından eski olamaz')
    .max(new Date().getFullYear() + 1, 'Gelecek yıldan araç eklenemez'),
  
  vin: z
    .string()
    .length(17, 'VIN numarası 17 karakter olmalı')
    .optional(),
  
  status: z.enum(['active', 'inactive', 'maintenance']).default('active'),
});

export const driverSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalı')
    .max(50, 'Ad en fazla 50 karakter olabilir'),
  
  lastName: z
    .string()
    .min(2, 'Soyad en az 2 karakter olmalı')
    .max(50, 'Soyad en fazla 50 karakter olabilir'),
  
  email: z
    .string()
    .email('Geçerli bir e-posta adresi girin'),
  
  phone: z
    .string()
    .regex(/^(\+90|0)?[1-9][0-9]{9}$/, 'Geçerli bir Türk telefon numarası girin'),
  
  licenseNumber: z
    .string()
    .min(5, 'Ehliyet numarası en az 5 karakter olmalı'),
  
  licenseExpiry: z
    .date()
    .min(new Date(), 'Ehliyet tarihi geçmiş olamaz'),
  
  licenseClass: z
    .string()
    .regex(/^[A-E][1-4]?$/, 'Geçerli ehliyet sınıfı girin (örn: B, C, CE)'),
  
  nationalId: z
    .string()
    .length(11, 'TC Kimlik No 11 haneli olmalı')
    .regex(/^[1-9][0-9]{10}$/, 'Geçersiz TC Kimlik No'),
});

export const routeSchema = z.object({
  vehicleId: z.string().uuid('Geçerli araç ID girin'),
  
  driverId: z.string().uuid('Geçerli sürücü ID girin'),
  
  stops: z
    .array(
      z.object({
        address: z.string().min(10, 'Adres en az 10 karakter olmalı'),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        customerName: z.string().min(2, 'Müşteri adı en az 2 karakter olmalı'),
        plannedTime: z.date().optional(),
      }),
    )
    .min(2, 'En az 2 durak olmalı')
    .max(50, 'En fazla 50 durak eklenebilir'),
  
  routeDate: z.date().min(new Date(), 'Rota tarihi geçmiş olamaz'),
  
  optimizationAlgorithm: z.enum(['TSP', 'GENETIC', '2OPT']).default('TSP'),
});

export const shipmentSchema = z.object({
  customerId: z.string().uuid('Geçerli müşteri ID girin'),
  
  origin: z.string().min(5, 'Başlangıç adresi en az 5 karakter olmalı'),
  
  destination: z.string().min(5, 'Varış adresi en az 5 karakter olmalı'),
  
  shipmentDate: z.date(),
  
  expectedDeliveryDate: z.date().optional(),
  
  serviceType: z.enum(['standard', 'express', 'economy', 'custom']),
  
  items: z
    .array(
      z.object({
        sku: z.string().min(3, 'SKU en az 3 karakter olmalı'),
        quantity: z.number().int().positive('Miktar pozitif olmalı'),
        weight: z.number().positive('Ağırlık pozitif olmalı').optional(),
        dimensions: z
          .object({
            length: z.number().positive(),
            width: z.number().positive(),
            height: z.number().positive(),
          })
          .optional(),
      }),
    )
    .min(1, 'En az 1 ürün olmalı'),
  
  totalWeight: z.number().positive('Toplam ağırlık pozitif olmalı').optional(),
  
  specialInstructions: z.string().max(500, 'Özel talimatlar 500 karakteri geçemez').optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;
export type DriverFormData = z.infer<typeof driverSchema>;
export type RouteFormData = z.infer<typeof routeSchema>;
export type ShipmentFormData = z.infer<typeof shipmentSchema>;

