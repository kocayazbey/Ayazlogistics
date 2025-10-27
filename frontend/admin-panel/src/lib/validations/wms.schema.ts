import { z } from 'zod';

export const receivingOrderSchema = z.object({
  warehouseId: z.string().uuid('Geçerli depo ID girin'),
  
  poNumber: z
    .string()
    .min(5, 'PO numarası en az 5 karakter olmalı')
    .max(50, 'PO numarası en fazla 50 karakter olabilir')
    .optional(),
  
  supplier: z
    .string()
    .min(3, 'Tedarikçi adı en az 3 karakter olmalı')
    .optional(),
  
  expectedDate: z.date().optional(),
  
  lineItems: z
    .array(
      z.object({
        productId: z.string().uuid('Geçerli ürün ID girin'),
        expectedQuantity: z.number().int().positive('Beklenen miktar pozitif olmalı'),
        receivedQuantity: z.number().int().nonnegative('Alınan miktar negatif olamaz').optional(),
        lotNumber: z.string().optional(),
        serialNumber: z.string().optional(),
        expiryDate: z.date().optional(),
        condition: z.enum(['good', 'damaged', 'expired']).default('good'),
        damageNotes: z.string().max(500).optional(),
      }),
    )
    .min(1, 'En az 1 ürün olmalı'),
});

export const pickingOrderSchema = z.object({
  warehouseId: z.string().uuid('Geçerli depo ID girin'),
  
  orderNumber: z
    .string()
    .min(5, 'Sipariş numarası en az 5 karakter olmalı'),
  
  customerId: z.string().uuid('Geçerli müşteri ID girin'),
  
  pickingMethod: z.enum(['wave', 'batch', 'zone', 'cluster', 'voice']),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  
  lineItems: z
    .array(
      z.object({
        productId: z.string().uuid(),
        locationId: z.string().uuid(),
        quantity: z.number().int().positive(),
        pickedQuantity: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1, 'En az 1 ürün olmalı'),
});

export const inventoryAdjustmentSchema = z.object({
  warehouseId: z.string().uuid(),
  
  locationId: z.string().uuid(),
  
  productId: z.string().uuid(),
  
  adjustmentType: z.enum(['add', 'remove', 'set']),
  
  quantity: z.number().int(),
  
  reason: z.enum([
    'cycle_count',
    'damage',
    'expiry',
    'theft',
    'found',
    'system_error',
    'other',
  ]),
  
  notes: z
    .string()
    .max(500, 'Notlar 500 karakteri geçemez')
    .optional(),
  
  referenceDocument: z.string().optional(),
});

export const transferOrderSchema = z.object({
  fromWarehouseId: z.string().uuid(),
  
  toWarehouseId: z.string().uuid(),
  
  fromLocationId: z.string().uuid().optional(),
  
  toLocationId: z.string().uuid().optional(),
  
  transferType: z.enum(['warehouse', 'location', 'pickface', 'pallet']),
  
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        lotNumber: z.string().optional(),
      }),
    )
    .min(1),
  
  expectedDate: z.date().optional(),
  
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export const cycleCountSchema = z.object({
  warehouseId: z.string().uuid(),
  
  countType: z.enum(['cycle', 'dynamic', 'corridor', 'full']),
  
  locations: z
    .array(z.string().uuid())
    .min(1, 'En az 1 lokasyon seçilmeli')
    .max(100, 'En fazla 100 lokasyon seçilebilir'),
  
  assignedTo: z.string().uuid('Geçerli kullanıcı ID girin').optional(),
  
  scheduledDate: z.date(),
  
  notes: z.string().max(500).optional(),
});

export type ReceivingOrderFormData = z.infer<typeof receivingOrderSchema>;
export type PickingOrderFormData = z.infer<typeof pickingOrderSchema>;
export type InventoryAdjustmentFormData = z.infer<typeof inventoryAdjustmentSchema>;
export type TransferOrderFormData = z.infer<typeof transferOrderSchema>;
export type CycleCountFormData = z.infer<typeof cycleCountSchema>;

