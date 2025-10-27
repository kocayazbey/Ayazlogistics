import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

interface WeightReading {
  weight: number;
  unit: 'kg' | 'lb';
  stable: boolean;
  timestamp: Date;
  scaleId: string;
}

interface ScaleConfig {
  port: string;
  baudRate: number;
  scaleType: 'truck' | 'pallet' | 'parcel';
  location: string;
}

@Injectable()
export class ScaleIntegrationService {
  private activeScales: Map<string, SerialPort> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  async connectScale(config: ScaleConfig): Promise<void> {
    const port = new SerialPort({
      path: config.port,
      baudRate: config.baudRate || 9600,
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    parser.on('data', async (data: string) => {
      const reading = this.parseWeightData(data, config);
      if (reading.stable) {
        await this.processWeightReading(reading);
      }
    });

    this.activeScales.set(config.port, port);

    await this.eventBus.publish('scale.connected', {
      port: config.port,
      scaleType: config.scaleType,
    });
  }

  private parseWeightData(rawData: string, config: ScaleConfig): WeightReading {
    const weightMatch = rawData.match(/(\d+\.?\d*)\s*(kg|lb|KG|LB)/i);
    const stableMatch = rawData.includes('ST') || rawData.includes('STABLE');

    return {
      weight: weightMatch ? parseFloat(weightMatch[1]) : 0,
      unit: weightMatch && weightMatch[2].toLowerCase() === 'lb' ? 'lb' : 'kg',
      stable: stableMatch,
      timestamp: new Date(),
      scaleId: config.port,
    };
  }

  private async processWeightReading(reading: WeightReading): Promise<void> {
    await this.eventBus.publish('scale.weight.measured', reading);

    if (reading.weight > 0) {
      console.log(`Weight reading: ${reading.weight} ${reading.unit}`);
    }
  }

  async captureWeight(scaleId: string, timeout: number = 5000): Promise<WeightReading> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Weight capture timeout'));
      }, timeout);

      const handler = (reading: WeightReading) => {
        if (reading.scaleId === scaleId && reading.stable) {
          clearTimeout(timer);
          resolve(reading);
        }
      };

      this.eventBus.subscribe('scale.weight.measured', handler);
    });
  }

  async recordTruckWeight(vehicleId: string, scaleId: string): Promise<{
    grossWeight: number;
    tareWeight: number;
    netWeight: number;
  }> {
    const grossReading = await this.captureWeight(scaleId, 10000);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tareReading = await this.captureWeight(scaleId, 10000);

    return {
      grossWeight: grossReading.weight,
      tareWeight: tareReading.weight,
      netWeight: grossReading.weight - tareReading.weight,
    };
  }

  async disconnectScale(scaleId: string): Promise<void> {
    const port = this.activeScales.get(scaleId);
    if (port && port.isOpen) {
      port.close();
      this.activeScales.delete(scaleId);
    }
  }

  getConnectedScales(): string[] {
    return Array.from(this.activeScales.keys());
  }
}

