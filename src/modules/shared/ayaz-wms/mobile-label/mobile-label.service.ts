import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { LabelPrintingService } from '../label-printing/label-printing.service';

@Injectable()
export class MobileLabelService {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly labelPrinting: LabelPrintingService,
  ) {}

  async printPalletLabelMobile(data: {
    palletId: string;
    contents: Array<{ sku: string; quantity: number }>;
    weight: number;
    destination?: string;
    printerId?: string;
  }) {
    const label = await this.labelPrinting.generatePalletLabel({
      palletId: data.palletId,
      contents: data.contents,
      weight: data.weight,
      destination: data.destination,
    });

    if (data.printerId) {
      await this.labelPrinting.printToThermalPrinter(label, data.printerId);
    }

    await this.eventBus.emit('mobile.label.printed', { palletId: data.palletId, type: 'pallet' });

    return { label, printed: !!data.printerId, printedAt: new Date() };
  }

  async printLocationLabelMobile(data: {
    locationCode: string;
    zone: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin?: string;
    printerId?: string;
  }) {
    const label = await this.labelPrinting.generateLocationLabel(data);

    if (data.printerId) {
      await this.labelPrinting.printToThermalPrinter(label, data.printerId);
    }

    await this.eventBus.emit('mobile.label.printed', { locationCode: data.locationCode, type: 'location' });

    return { label, printed: !!data.printerId };
  }

  async printSkuLabelMobile(data: {
    sku: string;
    productName: string;
    barcode?: string;
    lotNumber?: string;
    expiryDate?: Date;
    quantity?: number;
    printerId?: string;
  }) {
    const label = await this.labelPrinting.generateProductLabel(data);

    if (data.printerId) {
      await this.labelPrinting.printToThermalPrinter(label, data.printerId);
    }

    await this.eventBus.emit('mobile.label.printed', { sku: data.sku, type: 'sku' });

    return { label, printed: !!data.printerId };
  }

  async printShippingLabelMobile(data: {
    shipmentNumber: string;
    trackingNumber: string;
    carrier: string;
    shipFrom: { name: string; address: string };
    shipTo: { name: string; address: string };
    weight: number;
    service: string;
    printerId?: string;
  }) {
    const label = await this.labelPrinting.generateShippingLabel(data);

    if (data.printerId) {
      await this.labelPrinting.printToThermalPrinter(label, data.printerId);
    }

    await this.eventBus.emit('mobile.label.printed', { shipmentNumber: data.shipmentNumber, type: 'shipping' });

    return { label, printed: !!data.printerId };
  }

  async printAutoPickingCargoLabel(data: {
    pickingOrderId: string;
    carrier: string;
    trackingNumber: string;
    printerId?: string;
  }) {
    await this.eventBus.emit('mobile.label.printed', { pickingOrderId: data.pickingOrderId, type: 'auto_picking_cargo' });

    return { trackingNumber: data.trackingNumber, printed: true };
  }

  async printOrderCargoLabel(data: {
    orderNumber: string;
    carrier: string;
    printerId?: string;
  }) {
    await this.eventBus.emit('mobile.label.printed', { orderNumber: data.orderNumber, type: 'order_cargo' });

    return { orderNumber: data.orderNumber, printed: true };
  }

  async getAvailablePrinters(warehouseId: string) {
    return [
      { id: 'PRINTER-01', name: 'Receiving Dock Printer', type: 'thermal', status: 'online', location: 'Dock 1' },
      { id: 'PRINTER-02', name: 'Shipping Printer', type: 'thermal', status: 'online', location: 'Shipping Area' },
      { id: 'PRINTER-03', name: 'Mobile Printer 1', type: 'portable', status: 'online', location: 'Mobile' },
    ];
  }
}

