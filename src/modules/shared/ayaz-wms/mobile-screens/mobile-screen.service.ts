import { Injectable, Logger } from '@nestjs/common';

/**
 * Mobile Screen Configuration Service
 * Provides screen configurations and workflows for WMS mobile applications
 */
@Injectable()
export class MobileScreenService {
  private readonly logger = new Logger(MobileScreenService.name);

  /**
   * Get receiving screen configuration
   */
  getReceivingScreenConfig(language: string = 'en-US') {
    return {
      screenId: 'receiving',
      title: this.getLocalizedText(language, 'receiving_title'),
      fields: [
        {
          id: 'po_number',
          label: this.getLocalizedText(language, 'po_number'),
          type: 'barcode',
          required: true,
          validation: { minLength: 5, maxLength: 50 },
        },
        {
          id: 'product_barcode',
          label: this.getLocalizedText(language, 'product_barcode'),
          type: 'barcode',
          required: true,
        },
        {
          id: 'quantity',
          label: this.getLocalizedText(language, 'quantity'),
          type: 'number',
          required: true,
          validation: { min: 1, max: 99999 },
        },
        {
          id: 'lot_number',
          label: this.getLocalizedText(language, 'lot_number'),
          type: 'text',
          required: false,
        },
        {
          id: 'condition',
          label: this.getLocalizedText(language, 'condition'),
          type: 'select',
          required: true,
          options: ['good', 'damaged', 'expired'],
        },
      ],
      actions: [
        { id: 'scan', label: this.getLocalizedText(language, 'scan'), color: 'primary' },
        { id: 'manual_entry', label: this.getLocalizedText(language, 'manual_entry'), color: 'secondary' },
        { id: 'complete', label: this.getLocalizedText(language, 'complete'), color: 'success' },
      ],
    };
  }

  /**
   * Get picking screen configuration
   */
  getPickingScreenConfig(language: string = 'en-US') {
    return {
      screenId: 'picking',
      title: this.getLocalizedText(language, 'picking_title'),
      workflow: [
        {
          step: 1,
          name: 'scan_order',
          title: this.getLocalizedText(language, 'scan_order'),
          instruction: this.getLocalizedText(language, 'scan_order_instruction'),
        },
        {
          step: 2,
          name: 'navigate_to_location',
          title: this.getLocalizedText(language, 'navigate'),
          instruction: this.getLocalizedText(language, 'navigate_instruction'),
        },
        {
          step: 3,
          name: 'scan_product',
          title: this.getLocalizedText(language, 'scan_product'),
          instruction: this.getLocalizedText(language, 'scan_product_instruction'),
        },
        {
          step: 4,
          name: 'confirm_quantity',
          title: this.getLocalizedText(language, 'confirm_quantity'),
          instruction: this.getLocalizedText(language, 'confirm_quantity_instruction'),
        },
        {
          step: 5,
          name: 'place_in_tote',
          title: this.getLocalizedText(language, 'place_in_tote'),
          instruction: this.getLocalizedText(language, 'place_in_tote_instruction'),
        },
      ],
      features: {
        voicePicking: true,
        batchPicking: true,
        skipAllowed: true,
        photoCapture: true,
      },
    };
  }

  /**
   * Get putaway screen configuration
   */
  getPutawayScreenConfig(language: string = 'en-US') {
    return {
      screenId: 'putaway',
      title: this.getLocalizedText(language, 'putaway_title'),
      fields: [
        {
          id: 'product_scan',
          label: this.getLocalizedText(language, 'product'),
          type: 'barcode',
          required: true,
        },
        {
          id: 'quantity',
          label: this.getLocalizedText(language, 'quantity'),
          type: 'number',
          required: true,
        },
        {
          id: 'suggested_location',
          label: this.getLocalizedText(language, 'suggested_location'),
          type: 'display',
          editable: false,
        },
        {
          id: 'actual_location',
          label: this.getLocalizedText(language, 'actual_location'),
          type: 'barcode',
          required: true,
        },
      ],
      features: {
        locationSuggestion: true,
        alternativeLocations: true,
        locationVerification: true,
      },
    };
  }

  /**
   * Get cycle count screen configuration
   */
  getCycleCountScreenConfig(language: string = 'en-US') {
    return {
      screenId: 'cycle_count',
      title: this.getLocalizedText(language, 'cycle_count_title'),
      workflow: [
        {
          step: 1,
          name: 'scan_location',
          instruction: this.getLocalizedText(language, 'scan_location_instruction'),
        },
        {
          step: 2,
          name: 'count_items',
          instruction: this.getLocalizedText(language, 'count_items_instruction'),
        },
        {
          step: 3,
          name: 'submit_count',
          instruction: this.getLocalizedText(language, 'submit_count_instruction'),
        },
      ],
      features: {
        blindCount: true,
        varianceAlert: true,
        photoCapture: true,
        managerApproval: true,
      },
    };
  }

  /**
   * Get shipping screen configuration
   */
  getShippingScreenConfig(language: string = 'en-US') {
    return {
      screenId: 'shipping',
      title: this.getLocalizedText(language, 'shipping_title'),
      fields: [
        {
          id: 'shipment_scan',
          label: this.getLocalizedText(language, 'shipment_number'),
          type: 'barcode',
          required: true,
        },
        {
          id: 'carrier',
          label: this.getLocalizedText(language, 'carrier'),
          type: 'select',
          required: true,
        },
        {
          id: 'weight',
          label: this.getLocalizedText(language, 'weight'),
          type: 'number',
          required: true,
        },
        {
          id: 'tracking_number',
          label: this.getLocalizedText(language, 'tracking_number'),
          type: 'text',
          required: true,
        },
      ],
      features: {
        labelPrinting: true,
        rateComparison: true,
        manifestGeneration: true,
      },
    };
  }

  /**
   * Get all available screens
   */
  getAllScreens(language: string = 'en-US') {
    return [
      {
        id: 'receiving',
        name: this.getLocalizedText(language, 'receiving_title'),
        icon: 'inbox',
        config: this.getReceivingScreenConfig(language),
      },
      {
        id: 'picking',
        name: this.getLocalizedText(language, 'picking_title'),
        icon: 'shopping-cart',
        config: this.getPickingScreenConfig(language),
      },
      {
        id: 'putaway',
        name: this.getLocalizedText(language, 'putaway_title'),
        icon: 'archive',
        config: this.getPutawayScreenConfig(language),
      },
      {
        id: 'cycle_count',
        name: this.getLocalizedText(language, 'cycle_count_title'),
        icon: 'calculator',
        config: this.getCycleCountScreenConfig(language),
      },
      {
        id: 'shipping',
        name: this.getLocalizedText(language, 'shipping_title'),
        icon: 'truck',
        config: this.getShippingScreenConfig(language),
      },
    ];
  }

  private getLocalizedText(language: string, key: string): string {
    const translations: Record<string, Record<string, string>> = {
      'en-US': {
        receiving_title: 'Receiving',
        picking_title: 'Picking',
        putaway_title: 'Putaway',
        cycle_count_title: 'Cycle Count',
        shipping_title: 'Shipping',
        po_number: 'PO Number',
        product_barcode: 'Product Barcode',
        quantity: 'Quantity',
        lot_number: 'Lot Number',
        condition: 'Condition',
        scan: 'Scan',
        manual_entry: 'Manual Entry',
        complete: 'Complete',
        scan_order: 'Scan Order',
        scan_order_instruction: 'Scan the picking order barcode',
        navigate: 'Navigate to Location',
        navigate_instruction: 'Follow directions to the picking location',
        scan_product: 'Scan Product',
        scan_product_instruction: 'Scan the product barcode to verify',
        confirm_quantity: 'Confirm Quantity',
        confirm_quantity_instruction: 'Enter or verify the quantity picked',
        place_in_tote: 'Place in Tote',
        place_in_tote_instruction: 'Place items in tote and scan tote barcode',
        product: 'Product',
        suggested_location: 'Suggested Location',
        actual_location: 'Actual Location',
        scan_location_instruction: 'Scan the location to count',
        count_items_instruction: 'Count all items at this location',
        submit_count_instruction: 'Submit your count',
        shipment_number: 'Shipment Number',
        carrier: 'Carrier',
        weight: 'Weight',
        tracking_number: 'Tracking Number',
      },
      'tr-TR': {
        receiving_title: 'Mal Kabul',
        picking_title: 'Toplama',
        putaway_title: 'Yerine Koyma',
        cycle_count_title: 'Döngü Sayımı',
        shipping_title: 'Sevkiyat',
        po_number: 'Sipariş No',
        product_barcode: 'Ürün Barkodu',
        quantity: 'Miktar',
        lot_number: 'Lot Numarası',
        condition: 'Durum',
        scan: 'Tara',
        manual_entry: 'Manuel Giriş',
        complete: 'Tamamla',
        scan_order: 'Siparişi Tara',
        scan_order_instruction: 'Toplama sipariş barkodunu tarayın',
        navigate: 'Konuma Git',
        navigate_instruction: 'Toplama konumuna yönlendirmeyi takip edin',
        scan_product: 'Ürünü Tara',
        scan_product_instruction: 'Doğrulama için ürün barkodunu tarayın',
        confirm_quantity: 'Miktarı Onayla',
        confirm_quantity_instruction: 'Toplanan miktarı girin veya doğrulayın',
        place_in_tote: 'Sepete Yerleştir',
        place_in_tote_instruction: 'Ürünleri sepete yerleştirin ve sepet barkodunu tarayın',
        product: 'Ürün',
        suggested_location: 'Önerilen Konum',
        actual_location: 'Gerçek Konum',
        scan_location_instruction: 'Sayım yapılacak konumu tarayın',
        count_items_instruction: 'Bu konumdaki tüm ürünleri sayın',
        submit_count_instruction: 'Sayımınızı gönderin',
        shipment_number: 'Sevkiyat No',
        carrier: 'Kargo Firması',
        weight: 'Ağırlık',
        tracking_number: 'Takip Numarası',
      },
    };

    return translations[language]?.[key] || translations['en-US']?.[key] || key;
  }
}

