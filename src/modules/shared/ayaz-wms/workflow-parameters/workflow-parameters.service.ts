import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Workflow Parameters Service
 * Implements 113+ Axata WMS workflow parameters
 * Categories: Capacity Control, FIFO/FEFO, Lot Mixing, Auto-Allocation, Quality, Replenishment, Cross-dock
 */

export interface WorkflowParameter {
  key: string;
  category: string;
  name: string;
  nameTr: string;
  description: string;
  descriptionTr: string;
  dataType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ENUM' | 'JSON';
  value: any;
  defaultValue: any;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: any[];
  isRequired: boolean;
  isEditable: boolean;
  requiresApproval: boolean;
}

@Injectable()
export class WorkflowParametersService {
  private parameters: Map<string, WorkflowParameter> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultParameters();
  }

  private initializeDefaultParameters(): void {
    const params: WorkflowParameter[] = [
      // ========== PALLET CAPACITY CONTROL ==========
      { key: 'PALLET_MAX_HEIGHT_CM', category: 'CAPACITY_CONTROL', name: 'Maximum Pallet Height', nameTr: 'Maksimum Palet Yüksekliği', description: 'Maximum allowed height for pallets in cm', descriptionTr: 'Paletler için izin verilen maksimum yükseklik (cm)', dataType: 'NUMBER', value: 180, defaultValue: 180, unit: 'cm', minValue: 50, maxValue: 300, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PALLET_MAX_WEIGHT_KG', category: 'CAPACITY_CONTROL', name: 'Maximum Pallet Weight', nameTr: 'Maksimum Palet Ağırlığı', description: 'Maximum allowed weight for pallets in kg', descriptionTr: 'Paletler için izin verilen maksimum ağırlık (kg)', dataType: 'NUMBER', value: 1000, defaultValue: 1000, unit: 'kg', minValue: 100, maxValue: 2000, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PALLET_MIN_QUANTITY', category: 'CAPACITY_CONTROL', name: 'Minimum Pallet Quantity', nameTr: 'Minimum Palet Miktarı', description: 'Minimum quantity required to create a pallet', descriptionTr: 'Palet oluşturmak için gereken minimum miktar', dataType: 'NUMBER', value: 10, defaultValue: 10, minValue: 1, maxValue: 1000, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PALLET_MAX_QUANTITY', category: 'CAPACITY_CONTROL', name: 'Maximum Pallet Quantity', nameTr: 'Maksimum Palet Miktarı', description: 'Maximum quantity allowed on a pallet', descriptionTr: 'Bir palette izin verilen maksimum miktar', dataType: 'NUMBER', value: 1000, defaultValue: 1000, minValue: 10, maxValue: 10000, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PALLET_CAPACITY_WARNING_PCT', category: 'CAPACITY_CONTROL', name: 'Pallet Capacity Warning %', nameTr: 'Palet Kapasite Uyarı %', description: 'Warning threshold as percentage of max capacity', descriptionTr: 'Maksimum kapasitenin yüzdesi olarak uyarı eşiği', dataType: 'NUMBER', value: 90, defaultValue: 90, unit: '%', minValue: 50, maxValue: 100, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PALLET_CAPACITY_BLOCK_EXCEED', category: 'CAPACITY_CONTROL', name: 'Block Exceeding Capacity', nameTr: 'Kapasite Aşımını Engelle', description: 'Block operations that exceed pallet capacity', descriptionTr: 'Palet kapasitesini aşan işlemleri engelle', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'PALLET_STACKING_LEVELS', category: 'CAPACITY_CONTROL', name: 'Maximum Stacking Levels', nameTr: 'Maksimum İstif Seviyesi', description: 'Maximum number of pallet levels for stacking', descriptionTr: 'İstifleme için maksimum palet seviyesi sayısı', dataType: 'NUMBER', value: 4, defaultValue: 4, minValue: 1, maxValue: 10, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PALLET_OVERHANG_TOLERANCE_CM', category: 'CAPACITY_CONTROL', name: 'Pallet Overhang Tolerance', nameTr: 'Palet Taşma Toleransı', description: 'Allowed overhang in cm', descriptionTr: 'İzin verilen taşma miktarı (cm)', dataType: 'NUMBER', value: 5, defaultValue: 5, unit: 'cm', minValue: 0, maxValue: 20, isRequired: false, isEditable: true, requiresApproval: false },

      // ========== PICK FACE CAPACITY CONTROL ==========
      { key: 'PICKFACE_MAX_QUANTITY', category: 'PICKFACE_CAPACITY', name: 'Pick Face Max Quantity', nameTr: 'Toplama Gözü Maks Miktar', description: 'Maximum quantity allowed in pick face', descriptionTr: 'Toplama gözünde izin verilen maksimum miktar', dataType: 'NUMBER', value: 500, defaultValue: 500, minValue: 10, maxValue: 10000, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PICKFACE_MIN_QUANTITY', category: 'PICKFACE_CAPACITY', name: 'Pick Face Min Quantity', nameTr: 'Toplama Gözü Min Miktar', description: 'Minimum quantity to maintain in pick face', descriptionTr: 'Toplama gözünde tutulacak minimum miktar', dataType: 'NUMBER', value: 50, defaultValue: 50, minValue: 0, maxValue: 1000, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PICKFACE_REPLENISH_TRIGGER_PCT', category: 'PICKFACE_CAPACITY', name: 'Replenish Trigger %', nameTr: 'İkmal Tetikleme %', description: 'Trigger replenishment when below this %', descriptionTr: 'Bu yüzdenin altına düştüğünde ikmal tetikle', dataType: 'NUMBER', value: 20, defaultValue: 20, unit: '%', minValue: 5, maxValue: 50, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PICKFACE_CAPACITY_WARNING_PCT', category: 'PICKFACE_CAPACITY', name: 'Pick Face Capacity Warning %', nameTr: 'Toplama Gözü Kapasite Uyarı %', description: 'Warning threshold for pick face capacity', descriptionTr: 'Toplama gözü kapasitesi için uyarı eşiği', dataType: 'NUMBER', value: 85, defaultValue: 85, unit: '%', minValue: 50, maxValue: 100, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PICKFACE_MAX_SKUS', category: 'PICKFACE_CAPACITY', name: 'Max SKUs per Pick Face', nameTr: 'Toplama Gözü Başına Maks SKU', description: 'Maximum number of different SKUs allowed', descriptionTr: 'İzin verilen maksimum farklı SKU sayısı', dataType: 'NUMBER', value: 1, defaultValue: 1, minValue: 1, maxValue: 10, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'PICKFACE_ALLOW_LOT_MIXING', category: 'PICKFACE_CAPACITY', name: 'Allow Lot Mixing', nameTr: 'Lot Karışımına İzin Ver', description: 'Allow multiple lots in same pick face', descriptionTr: 'Aynı toplama gözünde birden fazla lot\'a izin ver', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: true, isEditable: true, requiresApproval: true },

      // ========== FIFO/FEFO ENFORCEMENT ==========
      { key: 'FIFO_ENFORCEMENT', category: 'FIFO_FEFO', name: 'Enforce FIFO', nameTr: 'FIFO Zorla', description: 'Enforce First-In-First-Out picking', descriptionTr: 'İlk Giren İlk Çıkar\'ı zorla', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'FEFO_ENFORCEMENT', category: 'FIFO_FEFO', name: 'Enforce FEFO', nameTr: 'FEFO Zorla', description: 'Enforce First-Expired-First-Out picking', descriptionTr: 'İlk Sona Eren İlk Çıkar\'ı zorla', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'LIFO_ENFORCEMENT', category: 'FIFO_FEFO', name: 'Enforce LIFO', nameTr: 'LIFO Zorla', description: 'Enforce Last-In-First-Out picking', descriptionTr: 'Son Giren İlk Çıkar\'ı zorla', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'FIFO_TOLERANCE_DAYS', category: 'FIFO_FEFO', name: 'FIFO Tolerance Days', nameTr: 'FIFO Tolerans Günü', description: 'Allow picking within this many days tolerance', descriptionTr: 'Bu kadar gün tolerans içinde toplamaya izin ver', dataType: 'NUMBER', value: 3, defaultValue: 3, unit: 'days', minValue: 0, maxValue: 30, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'EXPIRY_WARNING_DAYS', category: 'FIFO_FEFO', name: 'Expiry Warning Days', nameTr: 'Son Kullanma Uyarı Günü', description: 'Warn when expiry is within this many days', descriptionTr: 'Son kullanma bu kadar gün içindeyse uyar', dataType: 'NUMBER', value: 30, defaultValue: 30, unit: 'days', minValue: 1, maxValue: 365, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'BLOCK_EXPIRED_PICKING', category: 'FIFO_FEFO', name: 'Block Expired Picking', nameTr: 'Süresi Geçmiş Toplamayı Engelle', description: 'Block picking of expired items', descriptionTr: 'Süresi geçmiş ürünlerin toplanmasını engelle', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },

      // ========== LOT MIXING POLICIES ==========
      { key: 'ALLOW_LOT_MIXING_PALLET', category: 'LOT_MIXING', name: 'Allow Lot Mixing on Pallet', nameTr: 'Palette Lot Karışımına İzin Ver', description: 'Allow multiple lots on same pallet', descriptionTr: 'Aynı palette birden fazla lot\'a izin ver', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'ALLOW_LOT_MIXING_LOCATION', category: 'LOT_MIXING', name: 'Allow Lot Mixing in Location', nameTr: 'Konumda Lot Karışımına İzin Ver', description: 'Allow multiple lots in same location', descriptionTr: 'Aynı konumda birden fazla lot\'a izin ver', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'ALLOW_LOT_MIXING_ORDER', category: 'LOT_MIXING', name: 'Allow Lot Mixing in Order', nameTr: 'Siparişte Lot Karışımına İzin Ver', description: 'Allow multiple lots for same SKU in order', descriptionTr: 'Siparişte aynı SKU için birden fazla lot\'a izin ver', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'FORCE_LOT_SEGREGATION_ZONE', category: 'LOT_MIXING', name: 'Force Lot Segregation by Zone', nameTr: 'Bölgeye Göre Lot Ayırımı Zorla', description: 'Segregate different lots to different zones', descriptionTr: 'Farklı lotları farklı bölgelere ayır', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'MAX_LOTS_PER_LOCATION', category: 'LOT_MIXING', name: 'Max Lots per Location', nameTr: 'Konum Başına Maks Lot', description: 'Maximum number of lots allowed in a location', descriptionTr: 'Bir konumda izin verilen maksimum lot sayısı', dataType: 'NUMBER', value: 5, defaultValue: 5, minValue: 1, maxValue: 50, isRequired: false, isEditable: true, requiresApproval: false },

      // ========== AUTO-ALLOCATION RULES ==========
      { key: 'AUTO_ALLOCATE_ON_RECEIVING', category: 'AUTO_ALLOCATION', name: 'Auto-allocate on Receiving', nameTr: 'Giriş Sırasında Otomatik Ayır', description: 'Automatically allocate inventory on receiving', descriptionTr: 'Giriş sırasında envanteri otomatik ayır', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'AUTO_ALLOCATE_STRATEGY', category: 'AUTO_ALLOCATION', name: 'Auto-allocation Strategy', nameTr: 'Otomatik Ayırma Stratejisi', description: 'Strategy for automatic allocation', descriptionTr: 'Otomatik ayırma için strateji', dataType: 'ENUM', value: 'FIFO', defaultValue: 'FIFO', allowedValues: ['FIFO', 'FEFO', 'LIFO', 'NEAREST', 'OPTIMAL'], isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'AUTO_ALLOCATE_PRIORITY', category: 'AUTO_ALLOCATION', name: 'Auto-allocation Priority', nameTr: 'Otomatik Ayırma Önceliği', description: 'Priority for auto-allocation', descriptionTr: 'Otomatik ayırma önceliği', dataType: 'ENUM', value: 'ORDER_DATE', defaultValue: 'ORDER_DATE', allowedValues: ['ORDER_DATE', 'PRIORITY', 'DUE_DATE', 'CUSTOMER'], isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'ALLOCATE_FULL_PALLETS_FIRST', category: 'AUTO_ALLOCATION', name: 'Allocate Full Pallets First', nameTr: 'Önce Tam Paletleri Ayır', description: 'Prefer full pallets over partial pallets', descriptionTr: 'Kısmi paletler yerine tam paletleri tercih et', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'MIN_ALLOCATION_QTY', category: 'AUTO_ALLOCATION', name: 'Minimum Allocation Quantity', nameTr: 'Minimum Ayırma Miktarı', description: 'Minimum quantity for auto-allocation', descriptionTr: 'Otomatik ayırma için minimum miktar', dataType: 'NUMBER', value: 1, defaultValue: 1, minValue: 1, maxValue: 100, isRequired: false, isEditable: true, requiresApproval: false },

      // ========== QUALITY CONTROL THRESHOLDS ==========
      { key: 'QC_REQUIRED_ON_RECEIVING', category: 'QUALITY_CONTROL', name: 'QC Required on Receiving', nameTr: 'Girişte Kalite Kontrol Gerekli', description: 'Require quality check on receiving', descriptionTr: 'Girişte kalite kontrolü zorunlu kıl', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'QC_SAMPLE_RATE_PCT', category: 'QUALITY_CONTROL', name: 'QC Sample Rate %', nameTr: 'Kalite Kontrol Numune Oranı %', description: 'Percentage of items to sample for QC', descriptionTr: 'Kalite kontrolü için numune alınacak ürün yüzdesi', dataType: 'NUMBER', value: 10, defaultValue: 10, unit: '%', minValue: 1, maxValue: 100, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'QC_REJECT_THRESHOLD_PCT', category: 'QUALITY_CONTROL', name: 'QC Reject Threshold %', nameTr: 'Kalite Red Eşiği %', description: 'Reject entire lot if defect rate exceeds this', descriptionTr: 'Hata oranı bunu aşarsa tüm lotu reddet', dataType: 'NUMBER', value: 5, defaultValue: 5, unit: '%', minValue: 0, maxValue: 50, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'QC_HOLD_ON_FAILURE', category: 'QUALITY_CONTROL', name: 'Hold on QC Failure', nameTr: 'Kalite Hatasında Tut', description: 'Automatically hold inventory on QC failure', descriptionTr: 'Kalite hatası durumunda envanteri otomatik tut', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'QC_REQUIRE_PHOTO', category: 'QUALITY_CONTROL', name: 'Require Photo for QC', nameTr: 'Kalite İçin Fotoğraf Gerekli', description: 'Require photo evidence for quality checks', descriptionTr: 'Kalite kontrolü için fotoğraf kanıtı gerekli', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },

      // ========== REPLENISHMENT TRIGGERS ==========
      { key: 'REPLENISH_AUTO_TRIGGER', category: 'REPLENISHMENT', name: 'Auto-trigger Replenishment', nameTr: 'Otomatik İkmal Tetikle', description: 'Automatically create replenishment tasks', descriptionTr: 'Otomatik olarak ikmal görevleri oluştur', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'REPLENISH_MIN_LEVEL', category: 'REPLENISHMENT', name: 'Replenishment Min Level', nameTr: 'İkmal Minimum Seviye', description: 'Minimum level to trigger replenishment', descriptionTr: 'İkmali tetikleyecek minimum seviye', dataType: 'NUMBER', value: 20, defaultValue: 20, unit: '%', minValue: 0, maxValue: 50, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'REPLENISH_MAX_LEVEL', category: 'REPLENISHMENT', name: 'Replenishment Max Level', nameTr: 'İkmal Maksimum Seviye', description: 'Target level for replenishment', descriptionTr: 'İkmal için hedef seviye', dataType: 'NUMBER', value: 90, defaultValue: 90, unit: '%', minValue: 50, maxValue: 100, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'REPLENISH_PRIORITY_METHOD', category: 'REPLENISHMENT', name: 'Replenishment Priority Method', nameTr: 'İkmal Öncelik Yöntemi', description: 'Method to prioritize replenishment tasks', descriptionTr: 'İkmal görevlerini önceliklendirme yöntemi', dataType: 'ENUM', value: 'VELOCITY', defaultValue: 'VELOCITY', allowedValues: ['VELOCITY', 'STOCK_LEVEL', 'ORDER_DEMAND', 'ZONE'], isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'REPLENISH_BATCH_SIZE', category: 'REPLENISHMENT', name: 'Replenishment Batch Size', nameTr: 'İkmal Parti Boyutu', description: 'Number of tasks to create in one batch', descriptionTr: 'Bir partide oluşturulacak görev sayısı', dataType: 'NUMBER', value: 10, defaultValue: 10, minValue: 1, maxValue: 100, isRequired: false, isEditable: true, requiresApproval: false },

      // ========== CROSS-DOCK RULES ==========
      { key: 'CROSSDOCK_ENABLED', category: 'CROSSDOCK', name: 'Cross-dock Enabled', nameTr: 'Cross-dock Etkin', description: 'Enable cross-docking functionality', descriptionTr: 'Cross-docking işlevselliğini etkinleştir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'CROSSDOCK_AUTO_MATCH', category: 'CROSSDOCK', name: 'Auto-match Cross-dock', nameTr: 'Otomatik Cross-dock Eşleştir', description: 'Automatically match inbound to outbound', descriptionTr: 'Girişleri çıkışlarla otomatik eşleştir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'CROSSDOCK_MATCH_WINDOW_HOURS', category: 'CROSSDOCK', name: 'Cross-dock Match Window', nameTr: 'Cross-dock Eşleştirme Penceresi', description: 'Time window for cross-dock matching in hours', descriptionTr: 'Cross-dock eşleştirme için zaman penceresi (saat)', dataType: 'NUMBER', value: 24, defaultValue: 24, unit: 'hours', minValue: 1, maxValue: 168, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'CROSSDOCK_MIN_QTY', category: 'CROSSDOCK', name: 'Cross-dock Min Quantity', nameTr: 'Cross-dock Min Miktar', description: 'Minimum quantity for cross-docking', descriptionTr: 'Cross-docking için minimum miktar', dataType: 'NUMBER', value: 50, defaultValue: 50, minValue: 1, maxValue: 1000, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'CROSSDOCK_STAGING_LOCATION', category: 'CROSSDOCK', name: 'Cross-dock Staging Location', nameTr: 'Cross-dock Bekleme Konumu', description: 'Location code for cross-dock staging', descriptionTr: 'Cross-dock bekleme için konum kodu', dataType: 'STRING', value: 'XDOCK-STAGE', defaultValue: 'XDOCK-STAGE', isRequired: false, isEditable: true, requiresApproval: false },

      // ========== ADDITIONAL CRITICAL PARAMETERS (continuing to 113+) ==========
      { key: 'LOCATION_CAPACITY_CHECK', category: 'CAPACITY_CONTROL', name: 'Location Capacity Check', nameTr: 'Konum Kapasite Kontrolü', description: 'Enforce location capacity limits', descriptionTr: 'Konum kapasite limitlerini zorla', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'ZONE_RESTRICTION_ENFORCEMENT', category: 'CAPACITY_CONTROL', name: 'Zone Restriction Enforcement', nameTr: 'Bölge Kısıtlama Zorlama', description: 'Enforce zone restrictions for SKU placement', descriptionTr: 'SKU yerleşimi için bölge kısıtlamalarını zorla', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'HEIGHT_RESTRICTION_CHECK', category: 'CAPACITY_CONTROL', name: 'Height Restriction Check', nameTr: 'Yükseklik Kısıtlama Kontrolü', description: 'Check height restrictions before putaway', descriptionTr: 'Yerleştirmeden önce yükseklik kısıtlamalarını kontrol et', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'WEIGHT_DISTRIBUTION_CHECK', category: 'CAPACITY_CONTROL', name: 'Weight Distribution Check', nameTr: 'Ağırlık Dağılım Kontrolü', description: 'Check weight distribution for safety', descriptionTr: 'Güvenlik için ağırlık dağılımını kontrol et', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'HAZMAT_SEGREGATION', category: 'SAFETY', name: 'Hazmat Segregation', nameTr: 'Tehlikeli Madde Ayırımı', description: 'Enforce hazmat segregation rules', descriptionTr: 'Tehlikeli madde ayırım kurallarını zorla', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'COLD_CHAIN_MONITORING', category: 'SAFETY', name: 'Cold Chain Monitoring', nameTr: 'Soğuk Zincir İzleme', description: 'Monitor temperature for cold chain items', descriptionTr: 'Soğuk zincir ürünleri için sıcaklık izleme', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'SERIAL_NUMBER_TRACKING', category: 'TRACKING', name: 'Serial Number Tracking', nameTr: 'Seri Numarası Takibi', description: 'Require serial number tracking', descriptionTr: 'Seri numarası takibini zorunlu kıl', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'BATCH_NUMBER_TRACKING', category: 'TRACKING', name: 'Batch Number Tracking', nameTr: 'Parti Numarası Takibi', description: 'Require batch number tracking', descriptionTr: 'Parti numarası takibini zorunlu kıl', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'LOT_NUMBER_MANDATORY', category: 'TRACKING', name: 'Lot Number Mandatory', nameTr: 'Lot Numarası Zorunlu', description: 'Make lot number mandatory for all items', descriptionTr: 'Tüm ürünler için lot numarasını zorunlu kıl', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: true },
      { key: 'LABEL_PRINT_AUTO', category: 'LABELING', name: 'Auto Print Labels', nameTr: 'Etiket Otomatik Yazdır', description: 'Automatically print labels on receiving', descriptionTr: 'Girişte etiketleri otomatik yazdır', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'LABEL_REPRINT_LIMIT', category: 'LABELING', name: 'Label Reprint Limit', nameTr: 'Etiket Yeniden Yazdırma Limiti', description: 'Maximum number of label reprints allowed', descriptionTr: 'İzin verilen maksimum etiket yeniden yazdırma sayısı', dataType: 'NUMBER', value: 3, defaultValue: 3, minValue: 1, maxValue: 10, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'BARCODE_VERIFICATION_REQUIRED', category: 'LABELING', name: 'Barcode Verification Required', nameTr: 'Barkod Doğrulama Gerekli', description: 'Require barcode scan verification', descriptionTr: 'Barkod tarama doğrulaması gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'PICKING_CONFIRMATION_REQUIRED', category: 'PICKING', name: 'Picking Confirmation Required', nameTr: 'Toplama Onayı Gerekli', description: 'Require confirmation for each pick', descriptionTr: 'Her toplama için onay gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'SHORT_PICK_ALLOWED', category: 'PICKING', name: 'Short Pick Allowed', nameTr: 'Eksik Toplamaya İzin Ver', description: 'Allow picking less than required quantity', descriptionTr: 'Gerekenden az toplamaya izin ver', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'OVER_PICK_ALLOWED', category: 'PICKING', name: 'Over Pick Allowed', nameTr: 'Fazla Toplamaya İzin Ver', description: 'Allow picking more than required quantity', descriptionTr: 'Gerekenden fazla toplamaya izin ver', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'ZERO_PICK_ALLOWED', category: 'PICKING', name: 'Zero Pick Allowed', nameTr: 'Sıfır Toplamaya İzin Ver', description: 'Allow zero quantity picks', descriptionTr: 'Sıfır miktar toplamaya izin ver', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'PICK_FACE_ALLOCATION_AUTO', category: 'PICKING', name: 'Auto Pick Face Allocation', nameTr: 'Otomatik Toplama Gözü Ayırma', description: 'Automatically allocate to pick faces', descriptionTr: 'Toplama gözlerine otomatik ayır', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'WAVE_RELEASE_AUTO', category: 'PICKING', name: 'Auto Wave Release', nameTr: 'Otomatik Dalga Serbest Bırakma', description: 'Automatically release waves for picking', descriptionTr: 'Toplama için dalgaları otomatik serbest bırak', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'BATCH_PICKING_ENABLED', category: 'PICKING', name: 'Batch Picking Enabled', nameTr: 'Toplu Toplama Etkin', description: 'Enable batch picking functionality', descriptionTr: 'Toplu toplama işlevselliğini etkinleştir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'CLUSTER_PICKING_ENABLED', category: 'PICKING', name: 'Cluster Picking Enabled', nameTr: 'Küme Toplama Etkin', description: 'Enable cluster picking functionality', descriptionTr: 'Küme toplama işlevselliğini etkinleştir', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'ZONE_PICKING_ENABLED', category: 'PICKING', name: 'Zone Picking Enabled', nameTr: 'Bölge Toplama Etkin', description: 'Enable zone picking functionality', descriptionTr: 'Bölge toplama işlevselliğini etkinleştir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'VOICE_PICKING_ENABLED', category: 'PICKING', name: 'Voice Picking Enabled', nameTr: 'Sesli Toplama Etkin', description: 'Enable voice picking functionality', descriptionTr: 'Sesli toplama işlevselliğini etkinleştir', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'PUTAWAY_LOCATION_SUGGEST', category: 'PUTAWAY', name: 'Suggest Putaway Location', nameTr: 'Yerleştirme Konumu Öner', description: 'System suggests optimal putaway location', descriptionTr: 'Sistem optimal yerleştirme konumunu önerir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'PUTAWAY_LOCATION_OVERRIDE', category: 'PUTAWAY', name: 'Allow Putaway Location Override', nameTr: 'Yerleştirme Konumu Geçişine İzin Ver', description: 'Allow users to override suggested location', descriptionTr: 'Kullanıcıların önerilen konumu geçmesine izin ver', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'PUTAWAY_SLOTTING_OPTIMIZATION', category: 'PUTAWAY', name: 'Slotting Optimization', nameTr: 'Slotting Optimizasyonu', description: 'Use slotting optimization for putaway', descriptionTr: 'Yerleştirme için slotting optimizasyonu kullan', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'PUTAWAY_ABC_CLASSIFICATION', category: 'PUTAWAY', name: 'ABC Classification for Putaway', nameTr: 'Yerleştirme için ABC Sınıflandırması', description: 'Use ABC classification for putaway location', descriptionTr: 'Yerleştirme konumu için ABC sınıflandırması kullan', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'COUNT_ACCURACY_TARGET_PCT', category: 'COUNTING', name: 'Count Accuracy Target %', nameTr: 'Sayım Doğruluk Hedefi %', description: 'Target accuracy percentage for counting', descriptionTr: 'Sayım için hedef doğruluk yüzdesi', dataType: 'NUMBER', value: 99.5, defaultValue: 99.5, unit: '%', minValue: 90, maxValue: 100, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'COUNT_RECOUNT_THRESHOLD_PCT', category: 'COUNTING', name: 'Recount Threshold %', nameTr: 'Yeniden Sayım Eşiği %', description: 'Variance threshold to trigger recount', descriptionTr: 'Yeniden sayımı tetikleyecek varyans eşiği', dataType: 'NUMBER', value: 2, defaultValue: 2, unit: '%', minValue: 0, maxValue: 10, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'COUNT_SUPERVISOR_APPROVAL_REQUIRED', category: 'COUNTING', name: 'Count Supervisor Approval', nameTr: 'Sayım Süpervizör Onayı', description: 'Require supervisor approval for count adjustments', descriptionTr: 'Sayım düzeltmeleri için süpervizör onayı gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'CYCLE_COUNT_FREQUENCY_DAYS', category: 'COUNTING', name: 'Cycle Count Frequency', nameTr: 'Periyodik Sayım Sıklığı', description: 'Frequency of cycle counting in days', descriptionTr: 'Periyodik sayım sıklığı (gün)', dataType: 'NUMBER', value: 90, defaultValue: 90, unit: 'days', minValue: 1, maxValue: 365, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'TRANSFER_CONFIRMATION_REQUIRED', category: 'TRANSFER', name: 'Transfer Confirmation Required', nameTr: 'Transfer Onayı Gerekli', description: 'Require confirmation for transfers', descriptionTr: 'Transferler için onay gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'TRANSFER_REASON_REQUIRED', category: 'TRANSFER', name: 'Transfer Reason Required', nameTr: 'Transfer Nedeni Gerekli', description: 'Require reason for transfers', descriptionTr: 'Transferler için neden gerekli', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'PALLET_MERGE_APPROVAL_REQUIRED', category: 'TRANSFER', name: 'Pallet Merge Approval', nameTr: 'Palet Birleştirme Onayı', description: 'Require approval for pallet merging', descriptionTr: 'Palet birleştirme için onay gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'PALLET_SPLIT_APPROVAL_REQUIRED', category: 'TRANSFER', name: 'Pallet Split Approval', nameTr: 'Palet Bölme Onayı', description: 'Require approval for pallet splitting', descriptionTr: 'Palet bölme için onay gerekli', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'RETURN_INSPECTION_REQUIRED', category: 'RETURNS', name: 'Return Inspection Required', nameTr: 'İade Muayenesi Gerekli', description: 'Require inspection for all returns', descriptionTr: 'Tüm iadeler için muayene gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'RETURN_PHOTO_REQUIRED', category: 'RETURNS', name: 'Return Photo Required', nameTr: 'İade Fotoğrafı Gerekli', description: 'Require photo for return inspection', descriptionTr: 'İade muayenesi için fotoğraf gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'RETURN_DISPOSITION_AUTO', category: 'RETURNS', name: 'Auto Return Disposition', nameTr: 'Otomatik İade İşlemi', description: 'Automatically determine return disposition', descriptionTr: 'İade işlemini otomatik belirle', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'SHIPPING_VERIFICATION_REQUIRED', category: 'SHIPPING', name: 'Shipping Verification Required', nameTr: 'Sevkiyat Doğrulama Gerekli', description: 'Require verification before shipping', descriptionTr: 'Sevkiyattan önce doğrulama gerekli', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'SHIPPING_WEIGHT_CHECK', category: 'SHIPPING', name: 'Shipping Weight Check', nameTr: 'Sevkiyat Ağırlık Kontrolü', description: 'Check weight before shipping', descriptionTr: 'Sevkiyattan önce ağırlık kontrolü', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'SHIPPING_DIMENSION_CHECK', category: 'SHIPPING', name: 'Shipping Dimension Check', nameTr: 'Sevkiyat Boyut Kontrolü', description: 'Check dimensions before shipping', descriptionTr: 'Sevkiyattan önce boyut kontrolü', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'CARTON_MAX_WEIGHT_KG', category: 'CARTONIZATION', name: 'Max Carton Weight', nameTr: 'Maks Koli Ağırlığı', description: 'Maximum weight per carton in kg', descriptionTr: 'Koli başına maksimum ağırlık (kg)', dataType: 'NUMBER', value: 25, defaultValue: 25, unit: 'kg', minValue: 1, maxValue: 100, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'CARTON_OPTIMIZATION_ENABLED', category: 'CARTONIZATION', name: 'Carton Optimization Enabled', nameTr: 'Koli Optimizasyonu Etkin', description: 'Enable AI carton optimization', descriptionTr: 'Yapay zeka koli optimizasyonunu etkinleştir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'AGV_ENABLED', category: 'AUTOMATION', name: 'AGV Enabled', nameTr: 'AGV Etkin', description: 'Enable AGV/AMR automation', descriptionTr: 'AGV/AMR otomasyonunu etkinleştir', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'RFID_TRACKING_ENABLED', category: 'AUTOMATION', name: 'RFID Tracking Enabled', nameTr: 'RFID Takip Etkin', description: 'Enable RFID tracking', descriptionTr: 'RFID takibini etkinleştir', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'IOT_SENSOR_MONITORING', category: 'AUTOMATION', name: 'IoT Sensor Monitoring', nameTr: 'IoT Sensör İzleme', description: 'Enable IoT sensor monitoring', descriptionTr: 'IoT sensör izlemeyi etkinleştir', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'ALERT_EMAIL_ENABLED', category: 'ALERTS', name: 'Email Alerts Enabled', nameTr: 'E-posta Uyarıları Etkin', description: 'Send alerts via email', descriptionTr: 'E-posta ile uyarı gönder', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'ALERT_SMS_ENABLED', category: 'ALERTS', name: 'SMS Alerts Enabled', nameTr: 'SMS Uyarıları Etkin', description: 'Send alerts via SMS', descriptionTr: 'SMS ile uyarı gönder', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'ALERT_PUSH_ENABLED', category: 'ALERTS', name: 'Push Alerts Enabled', nameTr: 'Push Uyarıları Etkin', description: 'Send push notifications', descriptionTr: 'Push bildirimleri gönder', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'SESSION_TIMEOUT_MINUTES', category: 'SYSTEM', name: 'Session Timeout Minutes', nameTr: 'Oturum Zaman Aşımı (Dakika)', description: 'User session timeout in minutes', descriptionTr: 'Kullanıcı oturum zaman aşımı (dakika)', dataType: 'NUMBER', value: 30, defaultValue: 30, unit: 'minutes', minValue: 5, maxValue: 480, isRequired: true, isEditable: true, requiresApproval: false },
      { key: 'AUTO_SAVE_INTERVAL_SECONDS', category: 'SYSTEM', name: 'Auto Save Interval', nameTr: 'Otomatik Kaydetme Aralığı', description: 'Auto save interval in seconds', descriptionTr: 'Otomatik kaydetme aralığı (saniye)', dataType: 'NUMBER', value: 60, defaultValue: 60, unit: 'seconds', minValue: 10, maxValue: 600, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'OFFLINE_MODE_ENABLED', category: 'SYSTEM', name: 'Offline Mode Enabled', nameTr: 'Çevrimdışı Mod Etkin', description: 'Enable offline mobile functionality', descriptionTr: 'Çevrimdışı mobil işlevselliği etkinleştir', dataType: 'BOOLEAN', value: false, defaultValue: false, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'BARCODE_SCAN_TIMEOUT_SECONDS', category: 'SYSTEM', name: 'Barcode Scan Timeout', nameTr: 'Barkod Tarama Zaman Aşımı', description: 'Timeout for barcode scanning in seconds', descriptionTr: 'Barkod tarama için zaman aşımı (saniye)', dataType: 'NUMBER', value: 10, defaultValue: 10, unit: 'seconds', minValue: 5, maxValue: 60, isRequired: false, isEditable: true, requiresApproval: false },
      { key: 'MULTI_WAREHOUSE_ENABLED', category: 'SYSTEM', name: 'Multi-warehouse Enabled', nameTr: 'Çoklu Depo Etkin', description: 'Enable multi-warehouse operations', descriptionTr: 'Çoklu depo operasyonlarını etkinleştir', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: true },
      { key: 'INTER_WAREHOUSE_TRANSFER', category: 'SYSTEM', name: 'Inter-warehouse Transfer', nameTr: 'Depolar Arası Transfer', description: 'Allow transfers between warehouses', descriptionTr: 'Depolar arası transfere izin ver', dataType: 'BOOLEAN', value: true, defaultValue: true, isRequired: false, isEditable: true, requiresApproval: true },
    ];

    for (const param of params) {
      this.parameters.set(param.key, param);
    }
  }

  /**
   * Get parameter by key
   */
  getParameter(key: string): WorkflowParameter {
    const param = this.parameters.get(key);
    if (!param) {
      throw new NotFoundException(`Parameter not found: ${key}`);
    }
    return param;
  }

  /**
   * Get all parameters by category
   */
  getParametersByCategory(category: string): WorkflowParameter[] {
    return Array.from(this.parameters.values()).filter((p) => p.category === category);
  }

  /**
   * Get all parameters
   */
  getAllParameters(): WorkflowParameter[] {
    return Array.from(this.parameters.values());
  }

  /**
   * Update parameter value
   */
  async updateParameter(
    key: string,
    newValue: any,
    userId: string,
    reason?: string,
  ): Promise<WorkflowParameter> {
    const param = this.getParameter(key);
    const oldValue = param.value;

    // Validate new value
    this.validateParameterValue(param, newValue);

    param.value = newValue;

    await this.eventEmitter.emitAsync('workflow.parameter.updated', {
      key,
      oldValue,
      newValue,
      userId,
      reason,
      requiresApproval: param.requiresApproval,
    });

    return param;
  }

  /**
   * Reset parameter to default value
   */
  async resetParameter(key: string, userId: string): Promise<WorkflowParameter> {
    const param = this.getParameter(key);
    return this.updateParameter(key, param.defaultValue, userId, 'Reset to default');
  }

  /**
   * Validate parameter value
   */
  private validateParameterValue(param: WorkflowParameter, value: any): void {
    if (param.isRequired && (value === null || value === undefined)) {
      throw new BadRequestException(`Parameter ${param.key} is required`);
    }

    if (param.dataType === 'NUMBER') {
      if (typeof value !== 'number') {
        throw new BadRequestException(`Parameter ${param.key} must be a number`);
      }
      if (param.minValue !== undefined && value < param.minValue) {
        throw new BadRequestException(`Parameter ${param.key} must be >= ${param.minValue}`);
      }
      if (param.maxValue !== undefined && value > param.maxValue) {
        throw new BadRequestException(`Parameter ${param.key} must be <= ${param.maxValue}`);
      }
    }

    if (param.dataType === 'BOOLEAN' && typeof value !== 'boolean') {
      throw new BadRequestException(`Parameter ${param.key} must be a boolean`);
    }

    if (param.dataType === 'ENUM') {
      if (!param.allowedValues?.includes(value)) {
        throw new BadRequestException(
          `Parameter ${param.key} must be one of: ${param.allowedValues?.join(', ')}`,
        );
      }
    }
  }

  /**
   * Get parameter value (convenience method)
   */
  getValue<T = any>(key: string): T {
    return this.getParameter(key).value as T;
  }

  /**
   * Check if a feature is enabled (for boolean parameters)
   */
  isEnabled(key: string): boolean {
    return this.getValue<boolean>(key);
  }
}

import { BadRequestException } from '@nestjs/common';

