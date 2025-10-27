import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ScanEvent {
  barcode: string;
  scanType: 'EAN13' | 'CODE128' | 'CODE39' | 'QR' | 'DATAMATRIX' | 'UNKNOWN';
  timestamp: Date;
  scannerId?: string;
  location?: string;
}

@Injectable()
export class BarcodeScannerService {
  private readonly logger = new Logger(BarcodeScannerService.name);
  private readonly ports: Map<string, any> = new Map();

  constructor(private readonly eventBus: EventBusService) {
    this.initializeScanners();
  }

  private async getSerialPort() {
    try {
      const mod = await import('serialport');
      return mod as any;
    } catch (e) {
      this.logger.warn('serialport module not available; barcode scanning over serial is disabled');
      return null;
    }
  }

  private async initializeScanners(): Promise<void> {
    try {
      const SerialPort = await this.getSerialPort();
      if (!SerialPort) return;

      const ports = await SerialPort.list();
      for (const portInfo of ports) {
        if (portInfo.manufacturer?.includes('Scanner') || portInfo.manufacturer?.includes('Symbol')) {
          this.connectScanner(portInfo.path);
        }
      }
    } catch (error: any) {
      this.logger.error(`Scanner initialization failed: ${error.message}`);
    }
  }

  private async connectScanner(portPath: string): Promise<void> {
    const SerialPort = await this.getSerialPort();
    if (!SerialPort) return;

    try {
      const port = new SerialPort.SerialPort({
        path: portPath,
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
      });

      port.on('data', (data: Buffer) => {
        this.handleScan(data.toString().trim(), portPath);
      });

      port.on('error', (error: any) => {
        this.logger.error(`Scanner error on ${portPath}: ${error.message}`);
      });

      this.ports.set(portPath, port);
      this.logger.log(`Scanner connected on ${portPath}`);
    } catch (error: any) {
      this.logger.error(`Failed to connect scanner on ${portPath}: ${error.message}`);
    }
  }

  private async handleScan(barcode: string, scannerId: string): Promise<void> {
    const scanEvent: ScanEvent = {
      barcode,
      scanType: this.detectBarcodeType(barcode),
      timestamp: new Date(),
      scannerId,
    };

    await this.eventBus.emit('barcode.scanned', scanEvent);
    this.logger.debug(`Barcode scanned: ${barcode} (${scanEvent.scanType})`);
  }

  private detectBarcodeType(barcode: string): ScanEvent['scanType'] {
    if (/^\d{13}$/.test(barcode)) return 'EAN13';
    if (/^[A-Z0-9\-]+$/.test(barcode) && barcode.length > 6) return 'CODE128';
    if (/^[A-Z0-9\-\.\$\/\+%]+$/.test(barcode)) return 'CODE39';
    return 'UNKNOWN';
  }

  async simulateScan(barcode: string, scannerId?: string): Promise<void> {
    await this.handleScan(barcode, scannerId || 'VIRTUAL-SCANNER');
  }

  onModuleDestroy(): void {
    for (const [path, port] of this.ports) {
      try { port.close?.(); } catch {}
      this.logger.log(`Scanner disconnected on ${path}`);
    }
  }
}

